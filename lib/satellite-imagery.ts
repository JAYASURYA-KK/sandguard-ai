import { createCanvas, loadImage } from 'canvas';
import fetch from 'node-fetch';
import type { SatelliteImageResult } from './types/detection';

// Function to fetch Sentinel-2 imagery from public APIs
export async function getBeforeAfterImages(
  location: { lat: number; lng: number },
  beforeDate: string,
  afterDate: string
): Promise<SatelliteImageResult> {
  // Using development instance of Sentinel Hub
  const INSTANCE_ID = process.env.SENTINEL_HUB_INSTANCE_ID || 'development';
  const SENTINEL_HUB_API = `https://services.sentinel-hub.com/${INSTANCE_ID}/wms`;

  // Generate URLs for before and after images
  const beforeUrl = `${SENTINEL_HUB_API}/sentinel-2?REQUEST=GetMap&BBOX=${location.lng-0.1},${location.lat-0.1},${location.lng+0.1},${location.lat+0.1}&WIDTH=512&HEIGHT=512&FORMAT=image/jpeg&LAYERS=TRUE_COLOR&TIME=${beforeDate}`;
  const afterUrl = `${SENTINEL_HUB_API}/sentinel-2?REQUEST=GetMap&BBOX=${location.lng-0.1},${location.lat-0.1},${location.lng+0.1},${location.lat+0.1}&WIDTH=512&HEIGHT=512&FORMAT=image/jpeg&LAYERS=TRUE_COLOR&TIME=${afterDate}`;

  return {
    beforeUrl,
    afterUrl
  };
}

// Function to process images and detect changes
export async function processImages(beforeUrl: string, afterUrl: string): Promise<Buffer> {
  // Load both images
  const [beforeImg, afterImg] = await Promise.all([
    loadImage(beforeUrl),
    loadImage(afterUrl)
  ]);

  // Create canvas for processing
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');

  // Draw and compare images
  ctx.drawImage(beforeImg, 0, 0);
  const beforeData = ctx.getImageData(0, 0, 512, 512);
  
  ctx.drawImage(afterImg, 0, 0);
  const afterData = ctx.getImageData(0, 0, 512, 512);

  // Create difference map
  const diffCanvas = createCanvas(512, 512);
  const diffCtx = diffCanvas.getContext('2d');
  const diffData = diffCtx.createImageData(512, 512);

  for (let i = 0; i < beforeData.data.length; i += 4) {
    const diff = Math.abs(beforeData.data[i] - afterData.data[i]);
    diffData.data[i] = diff > 50 ? 255 : 0;     // Red channel
    diffData.data[i + 1] = 0;                   // Green channel
    diffData.data[i + 2] = 0;                   // Blue channel
    diffData.data[i + 3] = diff > 50 ? 128 : 0; // Alpha channel
  }

  diffCtx.putImageData(diffData, 0, 0);
  return diffCanvas.toBuffer('image/png');
}
