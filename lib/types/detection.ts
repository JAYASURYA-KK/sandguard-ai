import { Buffer } from 'buffer';

export interface ImageInputs {
  before: Buffer | string;
  after: Buffer | string;
  diffOverlay?: Buffer;
}

export interface DetectionResult {
  overlayBase64: string;
  width: number;
  height: number;
  changePixels: number;
  totalPixels: number;
  severity: number;
  mlDetection?: ChangeDetectionResult;
}

export interface ChangeDetectionResult {
  changedAreas: Array<{
    bbox: [number, number, number, number];
    confidence: number;
    type: string;
  }>;
  changePercentage: number;
}

export interface SatelliteImageResult {
  beforeUrl: string;
  afterUrl: string;
  diffBuffer?: Buffer;
}

export interface DetectionRecord {
  id?: string;
  createdAt: string;
  beforeImageBase64: string;
  afterImageBase64: string;
  overlayImageBase64: string;
  width: number;
  height: number;
  changePixels: number;
  totalPixels: number;
  severity: number;
  threshold: number;
  coordinates?: {
    lat?: number;
    lng?: number;
    bbox?: [number, number, number, number];
  };
  notes?: string;
  model: {
    type: string;
    version: string;
  };
}
