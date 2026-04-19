import { randomUUID } from "crypto";

import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { readSettings } from "@/lib/settings";

type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicUrl: string;
};

type DownloadedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  contentLength: number;
  originalUrl?: string;
};

type StoredImageResult = {
  key: string;
  url: string;
  contentType: string;
  size: number;
  originalUrl?: string;
};

type R2ConnectionResult = {
  ok: boolean;
  bucket: string;
  endpoint: string;
  publicUrl: string;
  summary: string;
};

const MAX_IMAGE_BYTES_BEFORE_COMPRESSION = 1024 * 1024;
const UPLOAD_RETRY_LIMIT = 3;

let clientCache: { cacheKey: string; client: S3Client } | null = null;

function formatR2Error(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name || "Unknown error";
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const metadata =
      record.$metadata && typeof record.$metadata === "object"
        ? (record.$metadata as Record<string, unknown>)
        : null;
    const parts = [
      String(record.name ?? record.Code ?? record.code ?? "").trim(),
      String(record.message ?? "").trim(),
      metadata?.httpStatusCode ? `HTTP ${String(metadata.httpStatusCode)}` : ""
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(": ");
    }
  }

  return String(error || "Unknown error");
}

async function readR2Config(): Promise<R2Config> {
  const settings = await readSettings();
  const accessKeyId = settings.r2AccessKey.trim() || process.env.R2_ACCESS_KEY?.trim() || "";
  const secretAccessKey = settings.r2SecretKey.trim() || process.env.R2_SECRET_KEY?.trim() || "";
  const bucket = settings.r2Bucket.trim() || process.env.R2_BUCKET?.trim() || "";
  const endpoint = (settings.r2Endpoint.trim() || process.env.R2_ENDPOINT?.trim() || "").replace(/\/$/, "");
  const publicUrl = (settings.r2PublicUrl.trim() || process.env.R2_PUBLIC_URL?.trim() || "").replace(/\/$/, "");

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicUrl) {
    throw new Error(
      "Cloudflare R2 configuration is incomplete. Required env: R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_URL."
    );
  }

  return {
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicUrl
  };
}

function getR2Client(config: R2Config) {
  const cacheKey = `${config.endpoint}|${config.accessKeyId}|${config.bucket}`;

  if (!clientCache || clientCache.cacheKey !== cacheKey) {
    clientCache = {
      cacheKey,
      client: new S3Client({
        region: "auto",
        endpoint: config.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      })
    };
  }

  return clientCache.client;
}

function normalizeImageContentType(contentType?: string | null) {
  const normalized = String(contentType ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (normalized.startsWith("image/")) {
    return normalized;
  }

  return "image/jpeg";
}

function extensionFromContentType(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/jpg":
    case "image/jpeg":
    default:
      return "jpg";
  }
}

function buildR2ObjectKey(extension: string, date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `ai-images/${year}/${month}/${Date.now()}-${randomUUID()}.${extension}`;
}

function buildPublicObjectUrl(publicUrl: string, key: string) {
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(label: string, fn: (attempt: number) => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= UPLOAD_RETRY_LIMIT; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      console.error(`[r2.${label}] attempt ${attempt} failed`, {
        error: formatR2Error(error),
        raw: error
      });

      if (attempt < UPLOAD_RETRY_LIMIT) {
        await sleep(attempt * 500);
      }
    }
  }

  throw new Error(`${label} failed: ${formatR2Error(lastError)}`);
}

async function downloadFromRemoteUrl(imageUrl: string): Promise<DownloadedImage> {
  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(45000)
  });

  if (!response.ok) {
    throw new Error(`Failed to download generated image (${response.status}).`);
  }

  const contentType = normalizeImageContentType(response.headers.get("content-type"));
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new Error("Generated image download returned an empty payload.");
  }

  return {
    buffer,
    contentType,
    extension: extensionFromContentType(contentType),
    contentLength: buffer.length,
    originalUrl: imageUrl
  };
}

async function downloadFromDataUrl(dataUrl: string): Promise<DownloadedImage> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Unsupported data URL returned from image generation.");
  }

  const contentType = normalizeImageContentType(match[1]);
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length === 0) {
    throw new Error("Generated image data URL was empty.");
  }

  return {
    buffer,
    contentType,
    extension: extensionFromContentType(contentType),
    contentLength: buffer.length
  };
}

export async function downloadGeneratedImage(source: string): Promise<DownloadedImage> {
  if (source.startsWith("data:image/")) {
    return downloadFromDataUrl(source);
  }

  return downloadFromRemoteUrl(source);
}

async function optimizeImageIfNeeded(image: DownloadedImage): Promise<DownloadedImage> {
  if (image.buffer.length <= MAX_IMAGE_BYTES_BEFORE_COMPRESSION) {
    return image;
  }

  try {
    const optimizedBuffer = await sharp(image.buffer)
      .rotate()
      .jpeg({
        quality: 82,
        mozjpeg: true
      })
      .toBuffer();

    if (optimizedBuffer.length >= image.buffer.length) {
      return image;
    }

    return {
      ...image,
      buffer: optimizedBuffer,
      contentType: "image/jpeg",
      extension: "jpg",
      contentLength: optimizedBuffer.length
    };
  } catch (error) {
    console.warn("[r2.optimize] Image optimization skipped", {
      error: error instanceof Error ? error.message : String(error)
    });
    return image;
  }
}

export async function uploadBufferToR2(image: DownloadedImage): Promise<StoredImageResult> {
  const config = await readR2Config();
  const client = getR2Client(config);
  const optimized = await optimizeImageIfNeeded(image);
  const key = buildR2ObjectKey(optimized.extension);

  await retry("upload", async () => {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: optimized.buffer,
        ContentType: optimized.contentType,
        CacheControl: "public, max-age=31536000, immutable"
      })
    );
  });

  return {
    key,
    url: buildPublicObjectUrl(config.publicUrl, key),
    contentType: optimized.contentType,
    size: optimized.buffer.length,
    originalUrl: image.originalUrl
  };
}

export async function persistGeneratedImageToR2(source: string) {
  const downloadedImage = await downloadGeneratedImage(source);
  return uploadBufferToR2(downloadedImage);
}

export async function testR2Connection(): Promise<R2ConnectionResult> {
  const config = await readR2Config();
  const client = getR2Client(config);
  const key = `healthchecks/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomUUID()}.txt`;
  const publicObjectUrl = buildPublicObjectUrl(config.publicUrl, key);

  await retry("head-bucket", async () => {
    await client.send(
      new HeadBucketCommand({
        Bucket: config.bucket
      })
    );
  });

  try {
    await retry("healthcheck-upload", async () => {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: "r2-ok",
          ContentType: "text/plain; charset=utf-8",
          CacheControl: "no-store"
        })
      );
    });

    const publicResponse = await fetch(publicObjectUrl, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store"
    });

    if (!publicResponse.ok) {
      throw new Error(`R2 object uploaded, but public URL returned HTTP ${publicResponse.status}.`);
    }

    const body = (await publicResponse.text()).trim();

    if (body !== "r2-ok") {
      throw new Error("R2 public URL responded, but returned unexpected content.");
    }

    return {
      ok: true,
      bucket: config.bucket,
      endpoint: config.endpoint,
      publicUrl: config.publicUrl,
      summary: `R2 bucket ${config.bucket} reachable and public URL is serving uploaded objects.`
    };
  } catch (error) {
    throw new Error(formatR2Error(error));
  } finally {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key
      })
    ).catch((error) => {
      console.warn("[r2.cleanup] Failed to delete healthcheck object", {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }
}
