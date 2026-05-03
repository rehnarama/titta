import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('presign worker', () => {
	it('handles CORS preflight', async () => {
		const request = new IncomingRequest('http://example.com/presign', { method: 'OPTIONS' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
	});

	it('returns 404 for unknown routes', async () => {
		const request = new IncomingRequest('http://example.com/unknown', { method: 'GET' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(404);
	});

	it('returns 400 when filename is missing', async () => {
		const request = new IncomingRequest('http://example.com/presign', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ contentType: 'image/png' }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		const body = await response.json<{ error: string }>();
		expect(body.error).toContain('filename');
	});

	it('returns 400 when contentType is missing', async () => {
		const request = new IncomingRequest('http://example.com/presign', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename: 'test.png' }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		const body = await response.json<{ error: string }>();
		expect(body.error).toContain('contentType');
	});

	it('returns presigned URL for valid request', async () => {
		const request = new IncomingRequest('http://example.com/presign', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename: 'photo.jpg', contentType: 'image/jpeg' }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		const body = await response.json<{ url: string; key: string; expiresIn: number }>();
		expect(body.url).toContain('r2.cloudflarestorage.com');
		expect(body.url).toContain('X-Amz-Signature');
		expect(body.key).toMatch(/^[0-9a-f-]+\.jpg$/);
		expect(body.expiresIn).toBe(3600);
	});

	it('preserves file extension in key', async () => {
		const request = new IncomingRequest('http://example.com/presign', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename: 'document.pdf', contentType: 'application/pdf' }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		const body = await response.json<{ key: string }>();
		expect(body.key).toMatch(/\.pdf$/);
	});
});
