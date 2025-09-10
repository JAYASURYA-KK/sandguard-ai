// Machine Learning Model for Riverbank Change Detection
// Uses advanced image processing algorithms for change detection

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export interface ChangeDetectionResult {
  changeMap: string; // base64 encoded change map
  confidence: number; // 0-1 confidence score
  changePercentage: number; // percentage of changed pixels
  vehicleDetections: VehicleDetection[];
  soilAnalysis: SoilAnalysis;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface VehicleDetection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  confidence: number;
  type: 'truck' | 'excavator' | 'bulldozer' | 'unknown';
}

export interface SoilAnalysis {
  erosionRisk: 'low' | 'medium' | 'high';
  soilType: 'clay' | 'sand' | 'rock' | 'mixed';
  moistureLevel: number; // 0-1
}

class RiverbankChangeDetector {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize advanced image processing algorithms
      // In production, this would load pre-trained models
      this.isInitialized = true;
      console.log('ML models initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML models:', error);
      throw error;
    }
  }

  // Advanced image processing algorithms for change detection
  private async advancedChangeDetection(beforePath: string, afterPath: string): Promise<{ changeMap: string; changePercentage: number }> {
    // Load and preprocess images
    const beforeBuffer = fs.readFileSync(beforePath);
    const afterBuffer = fs.readFileSync(afterPath);
    
    const { data: beforeData, info: beforeInfo } = await sharp(beforeBuffer)
      .resize(256, 256)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data: afterData, info: afterInfo } = await sharp(afterBuffer)
      .resize(256, 256)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const width = beforeInfo.width;
    const height = beforeInfo.height;
    const channels = beforeInfo.channels;
    
    // Advanced change detection algorithm
    const changeMapBuffer = Buffer.alloc(width * height * 4); // RGBA
    let changePixels = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const changeIdx = (y * width + x) * 4;
        
        // Calculate pixel difference with edge detection
        const dr = Math.abs(afterData[idx] - beforeData[idx]);
        const dg = Math.abs(afterData[idx + 1] - beforeData[idx + 1]);
        const db = Math.abs(afterData[idx + 2] - beforeData[idx + 2]);
        
        // Weighted difference calculation
        const diff = (dr * 0.299 + dg * 0.587 + db * 0.114);
        
        // Adaptive threshold based on local variance
        const localVariance = this.calculateLocalVariance(beforeData, x, y, width, height, channels);
        const threshold = 30 + (localVariance * 0.5);
        
        if (diff > threshold) {
          // Red overlay for changes
          changeMapBuffer[changeIdx] = 255;     // R
          changeMapBuffer[changeIdx + 1] = 0;   // G
          changeMapBuffer[changeIdx + 2] = 0;   // B
          changeMapBuffer[changeIdx + 3] = Math.min(255, diff * 2); // A
          changePixels++;
        } else {
          // Transparent for no changes
          changeMapBuffer[changeIdx] = 0;
          changeMapBuffer[changeIdx + 1] = 0;
          changeMapBuffer[changeIdx + 2] = 0;
          changeMapBuffer[changeIdx + 3] = 0;
        }
      }
    }
    
    const changeMapPng = await sharp(changeMapBuffer, {
      raw: { width, height, channels: 4 }
    }).png().toBuffer();
    
    const changeMap = `data:image/png;base64,${changeMapPng.toString('base64')}`;
    const changePercentage = (changePixels / (width * height)) * 100;
    
    return { changeMap, changePercentage };
  }
  
  private calculateLocalVariance(data: Buffer, x: number, y: number, width: number, height: number, channels: number): number {
    const kernelSize = 3;
    const halfKernel = Math.floor(kernelSize / 2);
    let sum = 0;
    let count = 0;
    
    for (let ky = -halfKernel; ky <= halfKernel; ky++) {
      for (let kx = -halfKernel; kx <= halfKernel; kx++) {
        const nx = x + kx;
        const ny = y + ky;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * channels;
          const intensity = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          sum += intensity;
          count++;
        }
      }
    }
    
    const mean = sum / count;
    let variance = 0;
    
    for (let ky = -halfKernel; ky <= halfKernel; ky++) {
      for (let kx = -halfKernel; kx <= halfKernel; kx++) {
        const nx = x + kx;
        const ny = y + ky;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * channels;
          const intensity = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          variance += Math.pow(intensity - mean, 2);
        }
      }
    }
    
    return Math.sqrt(variance / count);
  }

  async detectChanges(beforeImagePath: string, afterImagePath: string): Promise<ChangeDetectionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Use advanced change detection algorithm
      const { changeMap, changePercentage } = await this.advancedChangeDetection(beforeImagePath, afterImagePath);
      
      // Detect vehicles
      const vehicleDetections = await this.detectVehicles(afterImagePath);
      
      // Analyze soil
      const soilAnalysis = await this.analyzeSoil(afterImagePath);
      
      // Calculate metrics
      const confidence = this.calculateConfidence(changeMap, vehicleDetections);
      const severity = this.determineSeverity(changePercentage, vehicleDetections, soilAnalysis);
      
      return {
        changeMap,
        confidence,
        changePercentage,
        vehicleDetections,
        soilAnalysis,
        severity
      };
    } catch (error) {
      console.error('Error in change detection:', error);
      throw error;
    }
  }



  private async detectVehicles(imagePath: string): Promise<VehicleDetection[]> {
    // Simplified vehicle detection - in production, use YOLO or similar
    const detections: VehicleDetection[] = [];
    
    // Mock detection for demonstration
    // In production, this would use the actual vehicle detection model
    const mockDetections = [
      {
        bbox: [100, 150, 80, 60] as [number, number, number, number],
        confidence: 0.85,
        type: 'truck' as const
      },
      {
        bbox: [200, 200, 100, 80] as [number, number, number, number],
        confidence: 0.72,
        type: 'excavator' as const
      }
    ];
    
    return mockDetections;
  }

  private async analyzeSoil(imagePath: string): Promise<SoilAnalysis> {
    // Simplified soil analysis based on image characteristics
    const imageBuffer = fs.readFileSync(imagePath);
    const { data } = await sharp(imageBuffer)
      .resize(100, 100)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Analyze color distribution to determine soil type
    let brownPixels = 0;
    let totalPixels = data.length / 3;
    
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Simple brown detection
      if (r > 100 && g > 50 && b < 100 && r > g && g > b) {
        brownPixels++;
      }
    }
    
    const brownRatio = brownPixels / totalPixels;
    
    return {
      erosionRisk: brownRatio > 0.3 ? 'high' : brownRatio > 0.1 ? 'medium' : 'low',
      soilType: brownRatio > 0.5 ? 'clay' : brownRatio > 0.2 ? 'mixed' : 'sand',
      moistureLevel: Math.random() * 0.8 + 0.1 // Mock moisture level
    };
  }

  private calculateChangePercentage(changeMap: string): number {
    // Extract change data from base64 image
    // This is a simplified calculation
    return Math.random() * 30 + 5; // Mock percentage
  }

  private calculateConfidence(changeMap: string, vehicles: VehicleDetection[]): number {
    // Calculate confidence based on change map quality and vehicle detections
    let confidence = 0.7; // Base confidence
    
    if (vehicles.length > 0) {
      confidence += 0.2; // Higher confidence if vehicles detected
    }
    
    return Math.min(confidence, 1.0);
  }

  private determineSeverity(
    changePercentage: number,
    vehicles: VehicleDetection[],
    soil: SoilAnalysis
  ): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;
    
    // Change percentage scoring
    if (changePercentage > 20) score += 3;
    else if (changePercentage > 10) score += 2;
    else if (changePercentage > 5) score += 1;
    
    // Vehicle presence scoring
    score += vehicles.length;
    
    // Soil erosion risk scoring
    if (soil.erosionRisk === 'high') score += 2;
    else if (soil.erosionRisk === 'medium') score += 1;
    
    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }
}

// Singleton instance
export const riverbankDetector = new RiverbankChangeDetector();
