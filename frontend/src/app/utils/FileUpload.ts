interface FilePresignRequest {
  filename: string;
  contentType: string;
}
interface FilePresignResponse {
  url: string;
  key: string;
  expiresIn: number;
  bucketUrl: string;
}

const BASE_URL = import.meta.env.VITE_APP_FILE_UPLOAD_URL;
const PRESIGN_URL = `${BASE_URL}/presign`;

const IMAGE_CONTENT_TYPE_REGEX = /^image\//;

export class UnsupportedFileTypeError extends Error {}
export class UploadFailedError extends Error {}

export async function uploadFile(file: File): Promise<string> {
  const fileName = file.name;
  const contentType = file.type;

  const isImage = IMAGE_CONTENT_TYPE_REGEX.test(contentType);

  if (!isImage) {
    throw new UnsupportedFileTypeError(
      `Unsupported file type '${contentType}'. Only images are supported`,
    );
  }

  const presignResponse = await presign({
    filename: fileName,
    contentType,
  });

  const uploadResponse = await upload(file, presignResponse);

  return uploadResponse;
}

async function presign(
  request: FilePresignRequest,
): Promise<FilePresignResponse> {
  const response = await fetch(PRESIGN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    mode: "cors",
  });

  // TODO: codegen / validation
  return (await response.json()) as FilePresignResponse;
}

async function upload(
  file: File,
  presignResponse: FilePresignResponse,
): Promise<string> {
  const response = await fetch(presignResponse.url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
    mode: "cors",
  });
  if (!response.ok) {
    throw new UploadFailedError(
      `Upload Failed with status: ${response.status}. Reason: ${await response.text()}`,
    );
  }

  return `${presignResponse.bucketUrl}/${presignResponse.key}`;
}
