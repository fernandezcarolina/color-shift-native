// Photos come from the Vercel function deployed with the web prototype, which
// keeps the Unsplash access key on the server (never in the app).
import { pairFromColor } from './color';

export const PHOTO_API = 'https://color-shift-prototype.vercel.app/api/photos';

export type Photo = {
  id: string;
  /** Remote image; absent for the offline sample gradients. */
  url?: string;
  /** Gradient stops used when there's no image. */
  gradient?: string[];
  photographer: string;
  photographerUrl?: string;
  pair: [string, string];
};

/** Shown until live photos arrive, or if they can't load. The first matches the Figma frames. */
export const SAMPLES: Photo[] = [
  { id: 'sample-1', gradient: ['#FFA8CC', '#F2B54F', '#63C7AB', '#4F7AF2'], photographer: 'Mathew Schwartz', pair: ['FCD2AD', 'BE6FDC'] },
  { id: 'sample-2', gradient: ['#0F2A3D', '#2D6A73', '#E7B56A'], photographer: 'Sample 2', pair: ['23425B', 'F6C475'] },
  { id: 'sample-3', gradient: ['#F3EDE4', '#C9A27A', '#5B3A24'], photographer: 'Sample 3', pair: ['F6C475', '754E1B'] },
];

type ApiPhoto = { id: string; url: string; color: string; photographer: string; photographerUrl: string };

export async function fetchPhotos(count = 10): Promise<Photo[]> {
  const res = await fetch(`${PHOTO_API}?count=${count}`);
  if (!res.ok) throw new Error(`Photo API ${res.status}`);
  const data: ApiPhoto[] = await res.json();
  return data.map(p => ({
    id: p.id,
    url: p.url,
    photographer: p.photographer,
    photographerUrl: p.photographerUrl,
    pair: pairFromColor(p.color),
  }));
}
