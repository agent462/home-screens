import path from 'path';
import { promises as fs } from 'fs';
import { BACKGROUNDS_DIR } from '@/lib/constants';
import { fetchWithTimeout } from '@/lib/api-utils';

const BGS = path.join(process.cwd(), BACKGROUNDS_DIR);

interface DownloadOptions {
  timeout?: number;
  convertNonWeb?: boolean;
  validateImage?: boolean;
}

export async function downloadAndSaveBackground(
  imageUrl: string,
  filenamePrefix: string,
  options?: DownloadOptions,
): Promise<{ path: string }> {
  const { timeout = 60_000, convertNonWeb = false, validateImage = false } = options ?? {};

  const res = await fetchWithTimeout(imageUrl, { timeout });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

  const contentType = res.headers.get('content-type') ?? 'image/jpeg';

  if (validateImage) {
    const hasImageType = contentType.startsWith('image/');
    const hasImageExt = /\.(jpe?g|png|webp|gif|tiff?)(\?|$)/i.test(imageUrl);
    if (!hasImageType && !hasImageExt) {
      throw new Error('URL did not return an image');
    }
  }
  let buffer: Buffer = Buffer.from(await res.arrayBuffer());

  const isTiff = contentType.includes('tiff') || /\.tiff?(\?|$)/i.test(imageUrl);
  let converted = false;

  if (convertNonWeb && (isTiff || (!contentType.startsWith('image/jpeg') && !contentType.startsWith('image/png') && !contentType.startsWith('image/webp')))) {
    try {
      const sharp = (await import('sharp')).default;
      buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      converted = true;
    } catch {
      // If sharp can't process it, use the raw buffer
    }
  }

  const ext = (!converted && contentType.includes('png')) ? '.png'
    : (!converted && contentType.includes('webp')) ? '.webp'
    : '.jpg';
  const safeName = filenamePrefix.replace(/[^a-zA-Z0-9._-]/g, '_') + ext;

  await fs.mkdir(BGS, { recursive: true });
  await fs.writeFile(path.join(BGS, safeName), buffer);

  return { path: `/api/backgrounds/serve?file=${encodeURIComponent(safeName)}` };
}
