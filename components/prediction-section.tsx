import { useState, useEffect, useRef } from 'react';
import { loadModel, detectChanges } from '@/lib/ml/browser-change-detection-new';
import { DetectionCharts } from './detection-charts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ChangeDetectionResult } from '@/lib/types/detection';

export function PredictionSection() {
    const [beforeImage, setBeforeImage] = useState<File | null>(null);
    const [afterImage, setAfterImage] = useState<File | null>(null);
    const [beforePreview, setBeforePreview] = useState<string>('');
    const [afterPreview, setAfterPreview] = useState<string>('');
    const [prediction, setPrediction] = useState<ChangeDetectionResult | null>(null);
    const [allPredictions, setAllPredictions] = useState<ChangeDetectionResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const resultRef = useRef<HTMLDivElement>(null);

    // Load model on component mount
    useEffect(() => {
        const initModel = async () => {
            try {
                await loadModel();
            } catch (err) {
                setError('Failed to load model. Please refresh the page.');
            }
        };
        initModel();
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Update state and preview
        if (type === 'before') {
            setBeforeImage(file);
            setBeforePreview(URL.createObjectURL(file));
        } else {
            setAfterImage(file);
            setAfterPreview(URL.createObjectURL(file));
        }
    };

    const saveToDatabase = async (result: ChangeDetectionResult) => {
        try {
            const response = await fetch('/api/detections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...result,
                    timestamp: new Date().toISOString(),
                    beforeImage: beforePreview,
                    afterImage: afterPreview,
                }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to save detection');
            }
        } catch (err) {
            console.error('Error saving to database:', err);
        }
    };

    const predictChanges = async () => {
        if (!beforeImage || !afterImage) {
            setError('Please upload both before and after images');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Convert images to ImageData
            const beforeImageData = await createImageData(beforeImage);
            const afterImageData = await createImageData(afterImage);

            // Run prediction
            const result = await detectChanges(beforeImageData, afterImageData);
            setPrediction(result);
            setAllPredictions(prev => [...prev, result]);
            
            // Save to database
            await saveToDatabase(result);
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
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const exportToPDF = async () => {
        if (!resultRef.current || !prediction) return;

        const canvas = await html2canvas(resultRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 30;

        // Add title
        pdf.setFontSize(16);
        pdf.text('Mining Activity Detection Report', pdfWidth / 2, 20, { align: 'center' });
        
        // Add timestamp
        pdf.setFontSize(10);
        pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 27);

        // Add the screenshot
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
        // Save the PDF
        pdf.save('mining-detection-report.pdf');
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Image Upload Section */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Before Image</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'before')}
                            className="mb-4"
                        />
                        {beforePreview && (
                            <img src={beforePreview} alt="Before" className="w-full h-48 object-cover rounded" />
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">After Image</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'after')}
                            className="mb-4"
                        />
                        {afterPreview && (
                            <img src={afterPreview} alt="After" className="w-full h-48 object-cover rounded" />
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-center">
                <button
                    onClick={predictChanges}
                    disabled={isLoading || !beforeImage || !afterImage}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50"
                >
                    {isLoading ? 'Analyzing...' : 'Analyze Images'}
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {prediction && (
                <div ref={resultRef} className="bg-white rounded-lg shadow p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xl font-semibold mb-4">Detection Results</h3>
                            <dl className="grid grid-cols-2 gap-4">
                                <dt className="text-gray-600">Affected Area:</dt>
                                <dd className="font-semibold">{(prediction.affectedArea * 100).toFixed(1)}%</dd>
                                
                                <dt className="text-gray-600">Confidence:</dt>
                                <dd className="font-semibold">{(prediction.confidence * 100).toFixed(1)}%</dd>
                                
                                <dt className="text-gray-600">Severity:</dt>
                                <dd className="font-semibold">{prediction.severity}</dd>
                                
                                <dt className="text-gray-600">Score:</dt>
                                <dd className="font-semibold">{prediction.severityScore.toFixed(2)}</dd>
                            </dl>
                        </div>
                        
                        <div className="flex items-center justify-center">
                            <button
                                onClick={exportToPDF}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg"
                            >
                                Export Report as PDF
                            </button>
                        </div>
                    </div>

                    {allPredictions.length > 0 && (
                        <DetectionCharts data={allPredictions} />
                    )}
                </div>
            )}
        </div>
    );
}
