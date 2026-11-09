import { inBulgaria } from './boundary.ts';
import { getCapture } from './mapillary-api.ts';
import type { Viewer } from 'mapillary-js';

// Navigation is always app controlled; pointer controls only change the camera.
export const viewerComponents = {
  attribution: false, cover: false, direction: false, sequence: false, keyboard: false,
};

export class PanoramaError extends Error {}

export async function verifyCapture(token: string, id: string, fromEdge = false) {
  const image = await getCapture(token, id);
  if (!image.geometry || !inBulgaria(image.geometry.coordinates)) {
    throw new PanoramaError('This image has no verified position inside Bulgaria.');
  }
  if (image.camera_type !== 'spherical' && !(fromEdge && image.camera_type)) {
    throw new PanoramaError('Mapillary does not identify this image as a spherical panorama.');
  }
  return { ...image, geometry: image.geometry };
}

export async function moveToCapture(viewer: Viewer, id: string) {
  try {
    return await viewer.moveTo(id);
  } catch {
    throw new PanoramaError('Mapillary could not load this image. Try again or check the client token.');
  }
}
