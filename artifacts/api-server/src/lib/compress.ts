import fs from "node:fs/promises";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { logger } from "./logger";

// Images sharp can safely re-encode. GIF is deliberately excluded — animated
// GIFs are easy to corrupt/flatten by re-encoding, and they're rarely the
// large files worth compressing anyway.
const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_DIMENSION = 2000; // px, longest side — plenty for web display

async function compressImage(inputPath: string, mimeType: string): Promise<Buffer> {
  let image = sharp(inputPath).rotate(); // auto-orient from EXIF, then drop it
  const { width, height } = await image.metadata();
  if ((width ?? 0) > MAX_DIMENSION || (height ?? 0) > MAX_DIMENSION) {
    image = image.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true });
  }
  switch (mimeType) {
    case "image/jpeg":
      return image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    case "image/png":
      return image.png({ compressionLevel: 9, palette: true }).toBuffer();
    case "image/webp":
      return image.webp({ quality: 80 }).toBuffer();
    default:
      throw new Error(`compressImage called with non-image mime type: ${mimeType}`);
  }
}

async function compressPdf(inputPath: string): Promise<Buffer> {
  const bytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const saved = await pdf.save({ useObjectStreams: true });
  return Buffer.from(saved);
}

/**
 * Best-effort compression for an uploaded file. Returns a smaller buffer
 * when compression helped, or `null` when the type isn't handled or
 * compression made no improvement — callers should fall back to the
 * original file untouched in either case. Never throws: a compression
 * failure should never block an upload.
 */
export async function maybeCompress(inputPath: string, mimeType: string): Promise<Buffer | null> {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(mimeType) && mimeType !== "application/pdf") {
    return null;
  }
  try {
    const originalSize = (await fs.stat(inputPath)).size;
    const compressed = mimeType === "application/pdf"
      ? await compressPdf(inputPath)
      : await compressImage(inputPath, mimeType);
    if (compressed.length >= originalSize) {
      return null; // already optimal — don't ship a bigger "compressed" file
    }
    return compressed;
  } catch (err) {
    logger.warn({ err, mimeType }, "[uploads] compression failed, storing original file");
    return null;
  }
}
