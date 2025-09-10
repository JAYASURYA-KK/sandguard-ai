// Dataset Manager for Kaggle HRSCD and other change detection datasets
// Handles dataset loading, preprocessing, and model training

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface DatasetConfig {
  name: string;
  path: string;
  type: 'hrscd' | 'custom' | 'earth-engine';
  description: string;
  imagePairs: number;
  resolution: number;
}

export interface ImagePair {
  beforePath: string;
  afterPath: string;
  changeMapPath?: string;
  metadata: {
    location?: string;
    date?: string;
    coordinates?: { lat: number; lng: number };
  };
}

class DatasetManager {
  private datasets: Map<string, DatasetConfig> = new Map();
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.initializeDefaultDatasets();
  }

  private initializeDefaultDatasets() {
    // Initialize with sample datasets
    this.datasets.set('hrscd-sample', {
      name: 'HRSCD Sample Dataset',
      path: path.join(this.uploadsDir, 'datasets', 'hrscd-sample'),
      type: 'hrscd',
      description: 'High Resolution Semantic Change Detection sample data',
      imagePairs: 10,
      resolution: 512
    });

    this.datasets.set('riverbank-sample', {
      name: 'Riverbank Monitoring Dataset',
      path: path.join(this.uploadsDir, 'datasets', 'riverbank-sample'),
      type: 'custom',
      description: 'Custom riverbank erosion detection dataset',
      imagePairs: 15,
      resolution: 512
    });
  }

  async createSampleDataset(datasetId: string, numPairs: number = 10): Promise<void> {
    const datasetPath = path.join(this.uploadsDir, 'datasets', datasetId);
    
    // Create directory structure
    await fs.promises.mkdir(datasetPath, { recursive: true });
    await fs.promises.mkdir(path.join(datasetPath, 'before'), { recursive: true });
    await fs.promises.mkdir(path.join(datasetPath, 'after'), { recursive: true });
    await fs.promises.mkdir(path.join(datasetPath, 'change-maps'), { recursive: true });

    // Generate sample image pairs
    for (let i = 0; i < numPairs; i++) {
      await this.generateSampleImagePair(datasetId, i);
    }

    // Update dataset config
    this.datasets.set(datasetId, {
      name: `Sample Dataset ${datasetId}`,
      path: datasetPath,
      type: 'custom',
      description: `Generated sample dataset with ${numPairs} image pairs`,
      imagePairs: numPairs,
      resolution: 512
    });
  }

  private async generateSampleImagePair(datasetId: string, index: number): Promise<void> {
    const datasetPath = path.join(this.uploadsDir, 'datasets', datasetId);
    
    // Generate "before" image (healthy riverbank)
    const beforePath = path.join(datasetPath, 'before', `before_${index.toString().padStart(3, '0')}.png`);
    await this.generateHealthyRiverbankImage(beforePath);

    // Generate "after" image (eroded riverbank)
    const afterPath = path.join(datasetPath, 'after', `after_${index.toString().padStart(3, '0')}.png`);
    await this.generateErodedRiverbankImage(afterPath);

    // Generate change map
    const changeMapPath = path.join(datasetPath, 'change-maps', `change_${index.toString().padStart(3, '0')}.png`);
    await this.generateChangeMap(beforePath, afterPath, changeMapPath);
  }

  private async generateHealthyRiverbankImage(outputPath: string): Promise<void> {
    const width = 512;
    const height = 512;
    const imageBuffer = Buffer.alloc(width * height * 3);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        
        // Create healthy riverbank pattern
        const riverX = Math.sin(y * 0.01) * 80 + width / 2;
        const distanceFromRiver = Math.abs(x - riverX);
        
        if (distanceFromRiver < 40) {
          // River - blue
          imageBuffer[idx] = 30 + Math.random() * 20;
          imageBuffer[idx + 1] = 80 + Math.random() * 30;
          imageBuffer[idx + 2] = 120 + Math.random() * 20;
        } else if (distanceFromRiver < 80) {
          // Healthy vegetation - green
          imageBuffer[idx] = 20 + Math.random() * 30;
          imageBuffer[idx + 1] = 100 + Math.random() * 40;
          imageBuffer[idx + 2] = 30 + Math.random() * 20;
        } else {
          // Background vegetation
          imageBuffer[idx] = 30 + Math.random() * 30;
          imageBuffer[idx + 1] = 80 + Math.random() * 30;
          imageBuffer[idx + 2] = 20 + Math.random() * 20;
        }
      }
    }
    
    const pngBuffer = await sharp(imageBuffer, {
      raw: { width, height, channels: 3 }
    }).png().toBuffer();
    
    fs.writeFileSync(outputPath, pngBuffer);
  }

  private async generateErodedRiverbankImage(outputPath: string): Promise<void> {
    const width = 512;
    const height = 512;
    const imageBuffer = Buffer.alloc(width * height * 3);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        
        // Create eroded riverbank pattern
        const riverX = Math.sin(y * 0.01) * 80 + width / 2;
        const distanceFromRiver = Math.abs(x - riverX);
        
        if (distanceFromRiver < 50) {
          // Expanded river - more blue
          imageBuffer[idx] = 30 + Math.random() * 20;
          imageBuffer[idx + 1] = 80 + Math.random() * 30;
          imageBuffer[idx + 2] = 120 + Math.random() * 20;
        } else if (distanceFromRiver < 100) {
          // Eroded area - brown/red
          imageBuffer[idx] = 120 + Math.random() * 50;
          imageBuffer[idx + 1] = 80 + Math.random() * 30;
          imageBuffer[idx + 2] = 40 + Math.random() * 20;
        } else {
          // Background vegetation
          imageBuffer[idx] = 30 + Math.random() * 30;
          imageBuffer[idx + 1] = 80 + Math.random() * 30;
          imageBuffer[idx + 2] = 20 + Math.random() * 20;
        }
      }
    }
    
    const pngBuffer = await sharp(imageBuffer, {
      raw: { width, height, channels: 3 }
    }).png().toBuffer();
    
    fs.writeFileSync(outputPath, pngBuffer);
  }

  private async generateChangeMap(beforePath: string, afterPath: string, outputPath: string): Promise<void> {
    // Load both images
    const beforeBuffer = fs.readFileSync(beforePath);
    const afterBuffer = fs.readFileSync(afterPath);
    
    const { data: beforeData } = await sharp(beforeBuffer).raw().toBuffer({ resolveWithObject: true });
    const { data: afterData } = await sharp(afterBuffer).raw().toBuffer({ resolveWithObject: true });
    
    const width = 512;
    const height = 512;
    const changeMapBuffer = Buffer.alloc(width * height * 4); // RGBA
    
    // Calculate differences
    for (let i = 0; i < width * height; i++) {
      const idx = i * 3;
      const changeIdx = i * 4;
      
      const dr = Math.abs(afterData[idx] - beforeData[idx]);
      const dg = Math.abs(afterData[idx + 1] - beforeData[idx + 1]);
      const db = Math.abs(afterData[idx + 2] - beforeData[idx + 2]);
      
      const diff = (dr + dg + db) / 3;
      
      if (diff > 30) {
        // Red overlay for changes
        changeMapBuffer[changeIdx] = 255;     // R
        changeMapBuffer[changeIdx + 1] = 0;   // G
        changeMapBuffer[changeIdx + 2] = 0;   // B
        changeMapBuffer[changeIdx + 3] = 180; // A
      } else {
        // Transparent for no changes
        changeMapBuffer[changeIdx] = 0;
        changeMapBuffer[changeIdx + 1] = 0;
        changeMapBuffer[changeIdx + 2] = 0;
        changeMapBuffer[changeIdx + 3] = 0;
      }
    }
    
    const pngBuffer = await sharp(changeMapBuffer, {
      raw: { width, height, channels: 4 }
    }).png().toBuffer();
    
    fs.writeFileSync(outputPath, pngBuffer);
  }

  async getImagePairs(datasetId: string): Promise<ImagePair[]> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const pairs: ImagePair[] = [];
    const beforeDir = path.join(dataset.path, 'before');
    const afterDir = path.join(dataset.path, 'after');
    const changeMapDir = path.join(dataset.path, 'change-maps');

    if (!fs.existsSync(beforeDir) || !fs.existsSync(afterDir)) {
      return pairs;
    }

    const beforeFiles = fs.readdirSync(beforeDir).filter(f => f.endsWith('.png'));
    
    for (const beforeFile of beforeFiles) {
      const afterFile = beforeFile.replace('before_', 'after_');
      const changeMapFile = beforeFile.replace('before_', 'change_');
      
      const beforePath = path.join(beforeDir, beforeFile);
      const afterPath = path.join(afterDir, afterFile);
      const changeMapPath = fs.existsSync(path.join(changeMapDir, changeMapFile)) 
        ? path.join(changeMapDir, changeMapFile) 
        : undefined;

      if (fs.existsSync(afterPath)) {
        pairs.push({
          beforePath,
          afterPath,
          changeMapPath,
          metadata: {
            location: `Sample Location ${beforeFile.split('_')[1].split('.')[0]}`,
            date: new Date().toISOString().split('T')[0]
          }
        });
      }
    }

    return pairs;
  }

  async getDatasetInfo(datasetId: string): Promise<DatasetConfig | null> {
    return this.datasets.get(datasetId) || null;
  }

  async listDatasets(): Promise<DatasetConfig[]> {
    return Array.from(this.datasets.values());
  }

  async findBestBeforeImage(uploadedImagePath: string, datasetId: string = 'riverbank-sample'): Promise<string | null> {
    const pairs = await this.getImagePairs(datasetId);
    if (pairs.length === 0) return null;

    // For now, return a random before image
    // In production, this would use image similarity matching
    const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
    return randomPair.beforePath;
  }
}

// Singleton instance
export const datasetManager = new DatasetManager();

