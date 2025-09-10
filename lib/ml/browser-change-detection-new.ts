import * as tf from '@tensorflow/tfjs';
import type { ChangeDetectionResult } from '../types/detection';

let model: tf.LayersModel | null = null;

export async function loadModel() {
    if (!model) {
        try {
            // Create a simple comparison model
            const input1 = tf.input({shape: [256, 256, 3]}) as tf.SymbolicTensor;
            const input2 = tf.input({shape: [256, 256, 3]}) as tf.SymbolicTensor;

            // Shared convolutional layers
            const conv1 = tf.layers.conv2d({
                filters: 32,
                kernelSize: 3,
                activation: 'relu',
                padding: 'same'
            });

            const pool1 = tf.layers.maxPooling2d({poolSize: [2, 2]});
            const conv2 = tf.layers.conv2d({
                filters: 64,
                kernelSize: 3,
                activation: 'relu',
                padding: 'same'
            });
            const pool2 = tf.layers.maxPooling2d({poolSize: [2, 2]});
            const flatten = tf.layers.flatten();

            // Process both inputs
            const processed1 = flatten.apply(pool2.apply(conv2.apply(pool1.apply(conv1.apply(input1))))) as tf.SymbolicTensor;
            const processed2 = flatten.apply(pool2.apply(conv2.apply(pool1.apply(conv1.apply(input2))))) as tf.SymbolicTensor;

            // Combine features
            const combined = tf.layers.concatenate().apply([processed1, processed2]) as tf.SymbolicTensor;
            
            // Final dense layers
            const dense1 = tf.layers.dense({units: 64, activation: 'relu'}).apply(combined) as tf.SymbolicTensor;
            const output = tf.layers.dense({units: 1, activation: 'sigmoid'}).apply(dense1) as tf.SymbolicTensor;

            // Create and compile the model
            model = tf.model({
                inputs: [input1, input2],
                outputs: output
            });

            // Compile with same settings as training
            model.compile({
                optimizer: 'adam',
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            // Warmup prediction
            const warmupTensor = tf.zeros([1, 256, 256, 3]);
            await model.predict([warmupTensor, warmupTensor]);
            warmupTensor.dispose();

            console.log('Model initialized successfully');
        } catch (error) {
            console.error('Error initializing model:', error);
            throw new Error('Failed to initialize model: ' + error.message);
        }
    }
    return model;
}

async function preprocessImage(imageData: ImageData): Promise<tf.Tensor> {
    return tf.tidy(() => {
        // Convert image to tensor
        const tensor = tf.browser.fromPixels(imageData);
        
        // Resize to training input size
        const resized = tf.image.resizeBilinear(tensor, [256, 256], true);
        
        // Normalize to [0, 1] and enhance contrast
        const normalized = resized.toFloat().div(255.0);
        
        // Apply channel-wise normalization like in training
        const channels = tf.split(normalized, 3, 2);
        const enhancedChannels = channels.map(channel => {
            const mean = channel.mean();
            const std = tf.sqrt(channel.sub(mean).square().mean());
            return channel.sub(mean).div(std.add(1e-8)).mul(0.5).add(0.5);
        });
        
        const enhanced = tf.concat(enhancedChannels, 2);
        return enhanced;
    });
}

export async function detectChanges(beforeImage: ImageData, afterImage: ImageData): Promise<ChangeDetectionResult> {
    const loadedModel = await loadModel();
    if (!loadedModel) {
        throw new Error('Failed to load model');
    }
    
    // Preprocess both images
    const beforeTensor = await preprocessImage(beforeImage);
    const afterTensor = await preprocessImage(afterImage);
    
    // Make predictions with augmentations for robustness
    const predictions: number[] = [];
    
    // Base prediction
    const basePred = tf.tidy(() => {
        const beforeBatch = beforeTensor.expandDims(0);
        const afterBatch = afterTensor.expandDims(0);
        return (loadedModel.predict([beforeBatch, afterBatch]) as tf.Tensor).dataSync()[0];
    });
    predictions.push(basePred);
    
    // Augmented predictions for robustness
    for (let i = 0; i < 4; i++) {
        const pred = tf.tidy(() => {
            const augBefore = tf.tidy(() => {
                const scaled = beforeTensor.mul(tf.scalar(1.0 + (Math.random() - 0.5) * 0.1));
                return tf.clipByValue(scaled, 0, 1);
            });
            const augAfter = tf.tidy(() => {
                const scaled = afterTensor.mul(tf.scalar(1.0 + (Math.random() - 0.5) * 0.1));
                return tf.clipByValue(scaled, 0, 1);
            });
            
            const result = (loadedModel.predict([augBefore.expandDims(0), augAfter.expandDims(0)]) as tf.Tensor).dataSync()[0];
            augBefore.dispose();
            augAfter.dispose();
            return result;
        });
        predictions.push(pred);
    }
    
    // Calculate robust confidence score
    const confidence = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const uncertainty = Math.sqrt(
        predictions.reduce((acc, p) => acc + Math.pow(p - confidence, 2), 0) / predictions.length
    );
    
    // Generate detailed change heatmap
    const heatmap = tf.tidy(() => {
        const diff = afterTensor.sub(beforeTensor);
        const magnitude = diff.abs().mean(2);
        return magnitude.greater(0.2);
    });
    
    const heatmapData = await heatmap.data();
    const affectedArea = Array.from(heatmapData).filter(x => x > 0).length / heatmapData.length;
    
    // Clean up tensors
    beforeTensor.dispose();
    afterTensor.dispose();
    heatmap.dispose();
    
    // Determine severity based on both confidence and affected area with balanced weights
    let severity: 'none' | 'minor' | 'moderate' | 'severe';
    
    // Calculate weighted score considering both metrics
    const areaWeight = 0.7;  // Give more weight to affected area
    const confidenceWeight = 0.3;
    const combinedScore = (affectedArea * areaWeight) + (confidence * confidenceWeight);
    
    if (affectedArea > 0.5) {  // If large area is affected
        if (confidence < 0.3) {
            severity = 'moderate';  // Low confidence but large area -> moderate
        } else {
            severity = 'severe';    // Large area with better confidence -> severe
        }
    } else if (affectedArea > 0.2) {  // Medium affected area
        if (confidence < 0.4) {
            severity = 'minor';     // Low confidence -> minor
        } else {
            severity = 'moderate';  // Better confidence -> moderate
        }
    } else {  // Small affected area
        if (confidence < 0.5) {
            severity = 'none';      // Low confidence -> none
        } else {
            severity = 'minor';     // Better confidence -> minor
        }
    }
    
    return {
        changedAreas: [
            {
                bbox: [0, 0, 1, 1],
                confidence: confidence,
                type: severity
            }
        ],
        changePercentage: affectedArea * 100
    };
}
