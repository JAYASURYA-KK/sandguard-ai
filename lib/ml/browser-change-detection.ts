import * as tf from '@tensorflow/tfjs';
import type { ChangeDetectionResult } from '../types/detection';

// Initialize TensorFlow.js with WebGL backend
import '@tensorflow/tfjs-backend-webgl';

let model: tf.LayersModel | null = null;

export async function loadModel() {
  if (!model) {
    // For demonstration, we'll create a simple CNN for change detection
    model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [256, 256, 6],
          filters: 16,
          kernelSize: 3,
          activation: 'relu',
        }),
        tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }),
        tf.layers.conv2d({
          filters: 32,
          kernelSize: 3,
          activation: 'relu',
        }),
        tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });
  }
  return model;
}

export async function preprocessImage(imageData: ImageData): Promise<tf.Tensor> {
    return tf.tidy(() => {
        // Convert image to tensor
        const tensor = tf.browser.fromPixels(imageData);
        // Resize to training input size and normalize to [0, 1]
        const resized = tf.image.resizeBilinear(tensor, [256, 256]);
        const normalized = resized.toFloat().div(255.0);
        return normalized;
    });
}

export async function detectChanges(
  beforeImage: ImageData,
  afterImage: ImageData
): Promise<ChangeDetectionResult> {
  try {
    const model = await loadModel();
    if (!model) {
      throw new Error('Model not loaded');
    }

    // Preprocess images
    const beforeTensor = await preprocessImage(beforeImage);
    const afterTensor = await preprocessImage(afterImage);

    // Concatenate the tensors
    const combined = tf.concat([beforeTensor, afterTensor], 3);

    // Make prediction
    const prediction = model.predict(combined) as tf.Tensor;
    
    // Get prediction data
    const predictionData = await prediction.data();

    // Clean up tensors
    beforeTensor.dispose();
    afterTensor.dispose();
    combined.dispose();
    prediction.dispose();

    // Process results
    const changePercentage = predictionData[0];
    
    return {
      changedAreas: [
        {
          bbox: [0, 0, 100, 100],
          confidence: changePercentage,
          type: 'erosion'
        }
      ],
      changePercentage
    };
  } catch (error) {
    console.error('Error in change detection:', error);
    throw error;
  }
}
