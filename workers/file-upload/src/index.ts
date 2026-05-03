import { AwsClient } from 'aws4fetch';

const BUCKET_NAME = 'titta-uploads';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const url = new URL(request.url);

		if (url.pathname === '/presign' && request.method === 'POST') {
			return handlePresign(request, env);
		}

		return jsonResponse({ error: 'Not Found' }, 404);
	},
} satisfies ExportedHandler<Env>;

async function handlePresign(request: Request, env: Env): Promise<Response> {
	const body = await request.json<{ filename?: string; contentType?: string }>();
	if (!body.filename || !body.contentType) {
		return jsonResponse({ error: 'filename and contentType are required' }, 400);
	}

	const ext = body.filename.includes('.') ? body.filename.split('.').pop() : '';
	const key = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();

	const r2Client = new AwsClient({
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	});

	const expiresIn = 3600;
	const endpoint = `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/images/${key}?X-Amz-Expires=${expiresIn}`;

	const signed = await r2Client.sign(endpoint, {
		method: 'PUT',
		headers: { 'Content-Type': body.contentType },
		aws: { signQuery: true },
	});

	return jsonResponse({ url: signed.url, key: `images/${key}`, bucketUrl: env.BUCKET_PUBLIC_URL, expiresIn }, 200);
}

function jsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
	});
}
