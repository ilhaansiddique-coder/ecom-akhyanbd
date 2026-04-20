import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 client (S3-compatible API).
 *
 * Env vars required for writes/deletes/listing:
 *   R2_ACCOUNT_ID          — Cloudflare account id
 *   R2_ACCESS_KEY_ID       — R2 API token access key
 *   R2_SECRET_ACCESS_KEY   — R2 API token secret
 *   R2_BUCKET              — bucket name (e.g. akhiyan-uploads)
 *   R2_PUBLIC_URL          — public base URL (e.g. https://pub-xxx.r2.dev) — no trailing slash
 *
 * Reads go directly via R2_PUBLIC_URL so browsers never hit this client.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
export const R2_BUCKET = process.env.R2_BUCKET || "";
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

export function isR2Configured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL);
}

let _client: S3Client | null = null;
export function r2Client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

/** Upload buffer to R2. Returns full public URL. */
export async function r2Upload(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2Client().send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

/** Delete object by key. Returns true on success. */
export async function r2Delete(key: string): Promise<boolean> {
  try {
    await r2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** List objects. Returns array of { key, size, modified }. */
export async function r2List(prefix?: string): Promise<Array<{ key: string; size: number; modified: string }>> {
  const out: Array<{ key: string; size: number; modified: string }> = [];
  let ContinuationToken: string | undefined = undefined;
  do {
    const cmd = new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken });
    const res: ListObjectsV2CommandOutput = await r2Client().send(cmd);
    for (const obj of res.Contents || []) {
      if (!obj.Key) continue;
      out.push({
        key: obj.Key,
        size: obj.Size || 0,
        modified: (obj.LastModified || new Date()).toISOString(),
      });
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return out;
}

/** Build public URL for a given key. */
export function r2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}
