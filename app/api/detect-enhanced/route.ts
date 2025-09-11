// Enhanced Detection API with ML Models and Earth Engine Integration

import { NextRequest, NextResponse } from 'next/server';
import { riverbankDetector } from '@/lib/ml-model';
import { earthEngineService } from '@/lib/earth-engine';
import { datasetManager } from '@/lib/dataset-manager';
import { connectToDatabase, getCollection } from '@/lib/mongo';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { isLandscapeImage } from '@/lib/image-validation';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get parameters
    const lat = parseFloat(formData.get('lat') as string);
    const lng = parseFloat(formData.get('lng') as string);
    const beforeDate = formData.get('beforeDate') as string;
    const afterDate = formData.get('afterDate') as string;
    const useEarthEngine = formData.get('useEarthEngine') === 'true';
    const uploadedImage = formData.get('uploadedImage') as File | null;
    const uploadedBeforeImage = formData.get('uploadedBeforeImage') as File | null;
    const notes = formData.get('notes') as string || '';

    let beforeImagePath: string;
    let afterImagePath: string;

    if (useEarthEngine && lat && lng && beforeDate && afterDate) {
      // Use Google Earth Engine to download satellite images
      const earthEngineResult = await earthEngineService.downloadBeforeAfterImages({
        coordinates: { lat, lng },
        beforeDate,
        afterDate,
        cloudCover: 20,
        resolution: 30
      });
      
      // Use the URLs directly from Earth Engine service
      beforeImagePath = earthEngineResult.beforeImageUrl;
      afterImagePath = earthEngineResult.afterImageUrl;
    } else if (uploadedImage) {
      // For uploaded images, we'll send them directly to the backend API
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const formDataForBackend = new FormData();
      formDataForBackend.append('afterImage', uploadedImage);
      
      // Validate the uploaded image
      const buffer = Buffer.from(await uploadedImage.arrayBuffer());
      const validation = await isLandscapeImage(buffer);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.message },
          { status: 400 }
        );
      }

      // Convert buffer to base64 for sending to backend
      const afterImageBase64 = buffer.toString('base64');
      afterImagePath = `data:${uploadedImage.type};base64,${afterImageBase64}`;
      
      if (uploadedBeforeImage) {
        const beforeBuffer = Buffer.from(await uploadedBeforeImage.arrayBuffer());
        const beforeValidation = await isLandscapeImage(beforeBuffer);
        if (!beforeValidation.isValid) {
          return NextResponse.json(
            { error: beforeValidation.message },
            { status: 400 }
          );
        }
        const beforeImageBase64 = beforeBuffer.toString('base64');
        beforeImagePath = `data:${uploadedBeforeImage.type};base64,${beforeImageBase64}`;
      } else {
        // Use backend API to get a reference image
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/reference-image?lat=${lat}&lng=${lng}`);
        if (!response.ok) {
          throw new Error('Failed to get reference image from backend');
        }
        const referenceImage = await response.json();
        beforeImagePath = referenceImage.imageUrl;
      }
    } else {
      return NextResponse.json(
        { error: 'Either provide coordinates with dates for Earth Engine or upload an image' },
        { status: 400 }
      );
    }

    // Send detection request to backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const detectionResponse = await fetch(`${backendUrl}/api/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        beforeImage: beforeImagePath,
        afterImage: afterImagePath,
        lat,
        lng,
      }),
    });

    if (!detectionResponse.ok) {
      throw new Error('Failed to process detection on backend');
    }

    const detectionResult = await detectionResponse.json();

    // Create detection record using the backend response
    const detectionRecord = {
      createdAt: new Date().toISOString(),
      beforeImageBase64: detectionResult.beforeImageBase64 || beforeImagePath,
      afterImageBase64: detectionResult.afterImageBase64 || afterImagePath,
      overlayImageBase64: detectionResult.changeMap,
      width: detectionResult.width || 256,
      height: detectionResult.height || 256,
      changePixels: detectionResult.changePixels,
      totalPixels: detectionResult.totalPixels,
      severity: detectionResult.severity,
      threshold: detectionResult.threshold || 30,
      coordinates: lat && lng ? { lat, lng } : undefined,
      notes,
      model: {
        type: 'enhanced' as const,
        version: '1.0'
      },
      // Enhanced data
      confidence: detectionResult.confidence,
      changePercentage: detectionResult.changePercentage,
      vehicleDetections: detectionResult.vehicleDetections,
      soilAnalysis: detectionResult.soilAnalysis,
      severityLevel: detectionResult.severityLevel
    };

    // Save to database
    const detectionsCollection = await getCollection('detections');
    if (!detectionsCollection) {
      throw new Error('Failed to connect to database');
    }
    
    const result = await detectionsCollection.insertOne(detectionRecord);

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...detectionRecord,
      _id: result.insertedId.toString()
    });

  } catch (error) {
    console.error('Enhanced detection error:', error);
    return NextResponse.json(
      { error: 'Detection failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function findBeforeImage(uploadsDir: string, lat?: number, lng?: number): Promise<string> {
  // Look for existing "before" images in the uploads directory
  const files = fs.readdirSync(uploadsDir);
  const beforeImages = files.filter(file => 
    file.includes('before') || file.includes('earth-engine-before')
  );

  if (beforeImages.length > 0) {
    // Use the most recent before image
    const latestBefore = beforeImages.sort().pop()!;
    return path.join(uploadsDir, latestBefore);
  }

  // If no before images found, create a sample one
  const sampleBeforePath = path.join(uploadsDir, `sample-before-${Date.now()}.png`);
  await createSampleBeforeImage(sampleBeforePath);
  return sampleBeforePath;
}

async function createSampleBeforeImage(filepath: string): Promise<void> {
  // Create a sample "before" image showing healthy riverbank
  const width = 512;
  const height = 512;
  const imageBuffer = Buffer.alloc(width * height * 3);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      
      // Create healthy riverbank pattern
      const riverX = Math.sin(y * 0.02) * 50 + width / 2;
      const distanceFromRiver = Math.abs(x - riverX);
      
      if (distanceFromRiver < 30) {
        // River - blue
        imageBuffer[idx] = 50;
        imageBuffer[idx + 1] = 100;
        imageBuffer[idx + 2] = 150;
      } else if (distanceFromRiver < 60) {
        // Healthy vegetation - green
        imageBuffer[idx] = 40 + Math.random() * 30;
        imageBuffer[idx + 1] = 100 + Math.random() * 50;
        imageBuffer[idx + 2] = 30 + Math.random() * 20;
      } else {
        // Background vegetation
        imageBuffer[idx] = 30 + Math.random() * 40;
        imageBuffer[idx + 1] = 80 + Math.random() * 40;
        imageBuffer[idx + 2] = 20 + Math.random() * 30;
      }
    }
  }
  
  const pngBuffer = await sharp(imageBuffer, {
    raw: { width, height, channels: 3 }
  }).png().toBuffer();
  
  fs.writeFileSync(filepath, pngBuffer);
}

async function imageToBase64(imagePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  const resizedBuffer = await sharp(imageBuffer)
    .resize(512, 512)
    .png()
    .toBuffer();
  
  return `data:image/png;base64,${resizedBuffer.toString('base64')}`;
}

function getSeverityScore(severity: string): number {
  switch (severity) {
    case 'critical': return 90;
    case 'high': return 70;
    case 'medium': return 50;
    case 'low': return 20;
    default: return 30;
  }
}
