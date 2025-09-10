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
      
      beforeImagePath = earthEngineResult.beforeImagePath;
      afterImagePath = earthEngineResult.afterImagePath;
    } else if (uploadedImage) {
      // Use uploaded image as "after" image and optional provided "before" image
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filename = `uploaded-${Date.now()}-${uploadedImage.name}`;
      const uploadedPath = path.join(uploadsDir, filename);
      
      // Save uploaded image
      const buffer = Buffer.from(await uploadedImage.arrayBuffer());
      // Validate uploaded image is land-related
      const validation = await isLandscapeImage(buffer);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.message },
          { status: 400 }
        );
      }
      fs.writeFileSync(uploadedPath, buffer);
      
      afterImagePath = uploadedPath;
      
      if (uploadedBeforeImage) {
        const beforeFilename = `uploaded-before-${Date.now()}-${uploadedBeforeImage.name}`;
        const beforePath = path.join(uploadsDir, beforeFilename);
        const beforeBuffer = Buffer.from(await uploadedBeforeImage.arrayBuffer());
        const beforeValidation = await isLandscapeImage(beforeBuffer);
        if (!beforeValidation.isValid) {
          return NextResponse.json(
            { error: beforeValidation.message },
            { status: 400 }
          );
        }
        fs.writeFileSync(beforePath, beforeBuffer);
        beforeImagePath = beforePath;
      } else {
        // Find or create a "before" image from the dataset
        beforeImagePath = await datasetManager.findBestBeforeImage(uploadedPath) || await findBeforeImage(uploadsDir, lat, lng);
      }
    } else {
      return NextResponse.json(
        { error: 'Either provide coordinates with dates for Earth Engine or upload an image' },
        { status: 400 }
      );
    }

    // Run enhanced change detection
    const detectionResult = await riverbankDetector.detectChanges(beforeImagePath, afterImagePath);

    // Convert images to base64 for storage
    const beforeImageBase64 = await imageToBase64(beforeImagePath);
    const afterImageBase64 = await imageToBase64(afterImagePath);

    // Calculate severity score
    const severity = detectionResult.severity;
    const severityScore = getSeverityScore(severity);

    // Create detection record
    const detectionRecord = {
      createdAt: new Date().toISOString(),
      beforeImageBase64,
      afterImageBase64,
      overlayImageBase64: detectionResult.changeMap,
      width: 256,
      height: 256,
      changePixels: Math.round((detectionResult.changePercentage / 100) * 256 * 256),
      totalPixels: 256 * 256,
      severity: severityScore,
      threshold: 30,
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
      severityLevel: severity
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
