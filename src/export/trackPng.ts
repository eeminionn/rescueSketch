import type { TrackDocumentV1 } from '../domain';
import { renderTrackSvg, type TrackSvgOptions } from './renderTrackSvg';

export interface TrackPngOptions extends TrackSvgOptions {
  pixelScale?: number;
}

function resolvePixelScale(value: number | undefined): number {
  const pixelScale = value ?? 1;

  if (!Number.isFinite(pixelScale) || pixelScale <= 0 || pixelScale > 10) {
    throw new RangeError('pixelScale must be a finite number greater than 0 and at most 10.');
  }

  return pixelScale;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not rasterize the SVG track preview.'));
    image.src = source;
  });
}

export async function exportTrackPng(
  document: TrackDocumentV1,
  options: TrackPngOptions = {},
): Promise<Blob> {
  const pixelScale = resolvePixelScale(options.pixelScale);
  const svg = renderTrackSvg(document, options);
  const width = Math.round(document.canvas.widthMm * pixelScale);
  const height = Math.round(document.canvas.heightMm * pixelScale);
  const canvas = globalThis.document?.createElement('canvas');

  if (
    canvas === undefined ||
    typeof canvas.getContext !== 'function' ||
    typeof canvas.toBlob !== 'function'
  ) {
    throw new Error('PNG export requires a browser canvas implementation.');
  }

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('Could not create a 2D canvas context for the PNG export.');
  }

  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Could not encode the track preview as PNG.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}
