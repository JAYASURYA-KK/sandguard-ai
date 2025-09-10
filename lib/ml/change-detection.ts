import { NextResponse } from "next/server";
import * as tf from "@tensorflow/tfjs-node";

export interface ChangeDetectionResult {
  changedAreas: Array<{
    bbox: [number, number, number, number];
    confidence: number;
    type: string;
  }>;
  changePercentage: number;
}

let model: tf.LayersModel | null = null;

export async function loadModel() {
  if (!model) {
    const modelPath = `file://${process.cwd().replace(/\\/g, '/')}/public/models/best_model/model.json`;
    model = await tf.loadLayersModel(modelPath);
    const warmup = tf.zeros([1, 256, 256, 3]);
    await (model.predict([warmup, warmup]) as tf.Tensor).data();
    warmup.dispose();
  }
  return model;
}

export async function preprocessImage(imageBuffer: Buffer): Promise<tf.Tensor> {
  // Convert image buffer to tensor
  const decoded = tf.node.decodeImage(imageBuffer);
  
  // Resize to model input size (assuming 256x256)
  const resized = tf.image.resizeBilinear(decoded, [256, 256]);
  
  // Normalize to 0-1
  const normalized = resized.div(255);
  
  // Add batch dimension
  const batched = normalized.expandDims(0);
  
  decoded.dispose();
  resized.dispose();
  
  return batched;
}

export async function detectChanges(beforeBuffer: Buffer, afterBuffer: Buffer): Promise<ChangeDetectionResult> {
  try {
    const loadedModel = await loadModel();
    if (!loadedModel) throw new Error("Model not loaded");

    const beforeTensor = await preprocessImage(beforeBuffer);
    const afterTensor = await preprocessImage(afterBuffer);

    const out = loadedModel.predict([beforeTensor, afterTensor]) as tf.Tensor;
    const data = await out.data();
    const confidence = Number(data[0] ?? 0);

    beforeTensor.dispose();
    afterTensor.dispose();
    out.dispose();

    return {
      changedAreas: [
        {
          bbox: [0, 0, 100, 100],
          confidence,
          type: confidence >= 0.9 ? 'severe' : confidence >= 0.8 ? 'moderate' : 'minor'
        }
      ],
      changePercentage: Math.round(confidence * 100) / 100
    };
  } catch (error) {
    console.error("Error in change detection:", error);
    throw error;
  }
}
