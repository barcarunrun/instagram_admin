import { mkdir, access, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { BlobServiceClient } from "@azure/storage-blob";

const uploadRoot = path.resolve(process.cwd(), "uploads", "media-assets");

function getStorageMode(): "local" | "azure_blob" {
  return process.env.MEDIA_STORAGE_MODE === "azure_blob"
    ? "azure_blob"
    : "local";
}

function getAzureStorageConfig(): {
  connectionString: string;
  containerName: string;
} {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME?.trim();

  if (!connectionString || !containerName) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING と AZURE_STORAGE_CONTAINER_NAME を設定してください。",
    );
  }

  return { connectionString, containerName };
}

async function getBlobContainerClient() {
  const { connectionString, containerName } = getAzureStorageConfig();
  const serviceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = serviceClient.getContainerClient(containerName);

  await containerClient.createIfNotExists();
  return containerClient;
}

function toAbsolutePath(storageKey: string): string {
  return path.join(uploadRoot, storageKey);
}

export async function writeMediaToLocalStorage(params: {
  storageKey: string;
  buffer: Buffer;
}): Promise<string> {
  const absolutePath = toAbsolutePath(params.storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });

  try {
    await access(absolutePath, constants.F_OK);
    return absolutePath;
  } catch {
    await writeFile(absolutePath, params.buffer);
    return absolutePath;
  }
}

async function uploadMediaToAzureBlob(params: {
  storageKey: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  const containerClient = await getBlobContainerClient();
  const blobClient = containerClient.getBlockBlobClient(params.storageKey);

  await blobClient.uploadData(params.buffer, {
    blobHTTPHeaders: params.contentType
      ? { blobContentType: params.contentType }
      : undefined,
  });

  return blobClient.url;
}

export async function writeMediaToStorage(params: {
  storageKey: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<{ filePath: string; publicUrl?: string }> {
  const filePath = await writeMediaToLocalStorage({
    storageKey: params.storageKey,
    buffer: params.buffer,
  });

  if (getStorageMode() !== "azure_blob") {
    return { filePath };
  }

  const publicUrl = await uploadMediaToAzureBlob({
    storageKey: params.storageKey,
    buffer: params.buffer,
    contentType: params.contentType,
  });

  return {
    filePath,
    publicUrl,
  };
}

export function getStoredMediaPath(storageKey: string): string {
  return toAbsolutePath(storageKey);
}

export function isStoredRemotely(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export async function deleteStoredMediaFile(storageKey: string): Promise<void> {
  await rm(toAbsolutePath(storageKey), { force: true });

  if (getStorageMode() !== "azure_blob") {
    return;
  }

  const containerClient = await getBlobContainerClient();
  await containerClient.deleteBlob(storageKey).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("BlobNotFound")) {
      throw error;
    }
  });
}
