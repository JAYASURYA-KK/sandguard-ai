import { useState, useEffect } from 'react';
import { loadModel, detectChanges } from '../../lib/ml/browser-change-detection-new';
import type { ChangeDetectionResult } from '../../lib/types/detection';

export default function PredictPage() {
    const [beforeImage, setBeforeImage] = useState<File | null>(null);
    const [afterImage, setAfterImage] = useState<File | null>(null);
    const [beforePreview, setBeforePreview] = useState<string>('');
    const [afterPreview, setAfterPreview] = useState<string>('');
    const [prediction, setPrediction] = useState<ChangeDetectionResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [modelLoaded, setModelLoaded] = useState(false);

    // Load model on component mount
    useEffect(() => {
        const initModel = async () => {
            try {
                await loadModel();
                setModelLoaded(true);
            } catch (err) {
                setError('Failed to load model. Please refresh the page.');
                console.error('Model loading error:', err);
            }
        };
        initModel();
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        // Update state and preview
        if (type === 'before') {
            setBeforeImage(file);
            setBeforePreview(URL.createObjectURL(file));
        } else {
            setAfterImage(file);
            setAfterPreview(URL.createObjectURL(file));
        }
        setError('');
    };

    const predictChanges = async () => {
        if (!beforeImage || !afterImage) {
            setError('Please upload both before and after images');
            return;
        }

        if (!modelLoaded) {
            setError('Please wait for the model to load');
            return;
        }

        setIsLoading(true);
        setError('');
        setPrediction(null);

        try {
            // Convert images to ImageData
            const beforeImageData = await createImageData(beforeImage);
            const afterImageData = await createImageData(afterImage);

            // Run prediction
            const result = await detectChanges(beforeImageData, afterImageData);
            setPrediction(result);
        } catch (err) {
            setError('Failed to analyze images. Please try again.');
            console.error('Prediction error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to convert File to ImageData
    const createImageData = (file: File): Promise<ImageData> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                resolve(ctx.getImageData(0, 0, img.width, img.height));
                URL.revokeObjectURL(img.src); // Clean up the object URL
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Mining Activity Detection</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Before Image Upload */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Before Image</h2>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'before')}
                            className="mb-4"
                        />
                        {beforePreview && (
                            <img
                                src={beforePreview}
                                alt="Before"
                                className="max-w-full h-auto rounded-lg"
                            />
                        )}
                    </div>
                </div>

                {/* After Image Upload */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">After Image</h2>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'after')}
                            className="mb-4"
                        />
                        {afterPreview && (
                            <img
                                src={afterPreview}
                                alt="After"
                                className="max-w-full h-auto rounded-lg"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Status Messages */}
            <div className="text-center mb-4">
                {!modelLoaded && !error && (
                    <div className="text-blue-600">Loading AI model...</div>
                )}
            </div>

            {/* Analysis Controls */}
            <div className="flex flex-col items-center gap-4 mb-8">
                <button
                    onClick={predictChanges}
                    disabled={isLoading || !beforeImage || !afterImage || !modelLoaded}
                    className={`px-6 py-3 rounded-lg text-white font-semibold transition-colors
                        ${isLoading || !beforeImage || !afterImage || !modelLoaded
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {isLoading ? 'Analyzing...' : 'Analyze Changes'}
                </button>
                {error && (
                    <div className="text-red-600 font-medium">{error}</div>
                )}
            </div>

            {/* Results Display */}
            {prediction && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Severity</h3>
                            <div className={`text-lg font-bold ${
                                prediction.changedAreas[0].type === 'severe' ? 'text-red-600' :
                                prediction.changedAreas[0].type === 'moderate' ? 'text-orange-600' :
                                prediction.changedAreas[0].type === 'minor' ? 'text-yellow-600' :
                                'text-green-600'
                            }`}>
                                {prediction.changedAreas[0].type.charAt(0).toUpperCase() + 
                                 prediction.changedAreas[0].type.slice(1)}
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Confidence</h3>
                            <div className="text-lg font-bold">
                                {(prediction.changedAreas[0].confidence * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Affected Area</h3>
                            <div className="text-lg font-bold">
                                {prediction.changePercentage.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
