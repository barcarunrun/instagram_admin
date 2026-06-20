import { spawn } from "node:child_process";
import sharp from "sharp";
import ffprobe from "ffprobe-static";

export type ExtractedMediaMetadata = {
  mediaType: "image" | "video";
  mimeType: string;
  width: number;
  height: number;
  durationSeconds?: number;
};

type FfprobeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  duration?: string;
};

type FfprobeFormat = {
  duration?: string;
};

type FfprobeResult = {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
};

function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

async function extractImageMetadata(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractedMediaMetadata> {
  const metadata = await sharp(buffer).metadata();

  return {
    mediaType: "image",
    mimeType,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

function runFfprobe(filePath: string): Promise<FfprobeResult> {
  return new Promise((resolve, reject) => {
    const executable = ffprobe.path;
    if (!executable) {
      reject(new Error("ffprobe executable is not available."));
      return;
    }

    const process = spawn(executable, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      filePath,
    ]);
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    process.stdout.on("data", (chunk: Buffer) => {
      stdout.push(chunk);
    });

    process.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });

    process.on("error", reject);
    process.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            Buffer.concat(stderr).toString("utf8") ||
              `ffprobe exited with code ${code}`,
          ),
        );
        return;
      }

      try {
        resolve(
          JSON.parse(Buffer.concat(stdout).toString("utf8")) as FfprobeResult,
        );
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function extractVideoMetadata(
  filePath: string,
  mimeType: string,
): Promise<ExtractedMediaMetadata> {
  const metadata = await runFfprobe(filePath);
  const videoStream = metadata.streams?.find(
    (stream) => stream.codec_type === "video",
  );
  const duration = Number(
    videoStream?.duration ?? metadata.format?.duration ?? 0,
  );

  return {
    mediaType: "video",
    mimeType,
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : 0,
  };
}

export async function extractMediaMetadata(params: {
  buffer: Buffer;
  filePath: string;
  mimeType: string;
}): Promise<ExtractedMediaMetadata> {
  if (isVideoMimeType(params.mimeType)) {
    return extractVideoMetadata(params.filePath, params.mimeType);
  }

  return extractImageMetadata(params.buffer, params.mimeType);
}
