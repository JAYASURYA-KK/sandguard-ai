// Initialize sample datasets for the riverbank change detection system

import { NextResponse } from 'next/server';
import { datasetManager } from '@/lib/dataset-manager';

export async function POST() {
  try {
    // Create sample datasets
    await datasetManager.createSampleDataset('hrscd-sample', 10);
    await datasetManager.createSampleDataset('riverbank-sample', 15);
    
    const datasets = await datasetManager.listDatasets();
    
    return NextResponse.json({
      success: true,
      message: 'Sample datasets initialized successfully',
      datasets: datasets.map(d => ({
        id: d.name.toLowerCase().replace(/\s+/g, '-'),
        name: d.name,
        description: d.description,
        imagePairs: d.imagePairs,
        resolution: d.resolution
      }))
    });
  } catch (error) {
    console.error('Error initializing datasets:', error);
    return NextResponse.json(
      { error: 'Failed to initialize datasets: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const datasets = await datasetManager.listDatasets();
    
    return NextResponse.json({
      datasets: datasets.map(d => ({
        id: d.name.toLowerCase().replace(/\s+/g, '-'),
        name: d.name,
        description: d.description,
        imagePairs: d.imagePairs,
        resolution: d.resolution
      }))
    });
  } catch (error) {
    console.error('Error listing datasets:', error);
    return NextResponse.json(
      { error: 'Failed to list datasets: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

