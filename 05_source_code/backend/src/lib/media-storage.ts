import { mkdir, access, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const uploadRoot = path.resolve(process.cwd(), "uploads", "media-assets");

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

export function getStoredMediaPath(storageKey: string): string {
  return toAbsolutePath(storageKey);
}

export async function deleteStoredMediaFile(storageKey: string): Promise<void> {
  await rm(toAbsolutePath(storageKey), { force: true });
}
