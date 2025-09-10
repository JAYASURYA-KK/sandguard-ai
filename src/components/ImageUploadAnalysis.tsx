import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { loadModel, detectChanges } from '../../lib/ml/browser-change-detection-new';
import type { ChangeDetectionResult } from '../../lib/types/detection';
import { 
  Upload, 
  X, 
  Scan, 
  CheckCircle, 
  AlertTriangle,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Zap,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadedImage {
  file: File;
  preview: string;
  name: string;
}

export default function ImageUploadAnalysis() {
  // Initialize model on component mount
  useEffect(() => {
    const initModel = async () => {
      try {
        await loadModel();
        setModelLoaded(true);
      } catch (err) {
        console.error('Failed to load model:', err);
        toast({
          title: "Model Loading Error",
          description: "Failed to load the AI model. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    initModel();
  }, []);
  const [beforeImage, setBeforeImage] = useState<UploadedImage | null>(null);
  const [afterImage, setAfterImage] = useState<UploadedImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ChangeDetectionResult | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const { toast } = useToast();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleImageUpload = useCallback((file: File, type: 'before' | 'after') => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    const uploadedImage: UploadedImage = {
      file,
      preview,
      name: file.name,
    };

    if (type === 'before') {
      setBeforeImage(uploadedImage);
    } else {
      setAfterImage(uploadedImage);
    }

    toast({
      title: "Image uploaded",
      description: `${type === 'before' ? 'Before' : 'After'} image uploaded successfully`,
    });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'before' | 'after') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file, type);
    }
  }, [handleImageUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file, type);
    }
  }, [handleImageUpload]);

  const removeImage = (type: 'before' | 'after') => {
    if (type === 'before') {
      if (beforeImage) {
        URL.revokeObjectURL(beforeImage.preview);
        setBeforeImage(null);
      }
    } else {
      if (afterImage) {
        URL.revokeObjectURL(afterImage.preview);
        setAfterImage(null);
      }
    }
    setAnalysisResult(null);
  };

  const runAnalysis = async () => {
    if (!beforeImage || !afterImage) {
      toast({
        title: "Images required",
        description: "Please upload both before and after images",
        variant: "destructive",
      });
      return;
    }

    if (!modelLoaded) {
      toast({
        title: "Model not ready",
        description: "Please wait for the AI model to finish loading",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const beforeImageData = await createImageData(beforeImage.file);
      const afterImageData = await createImageData(afterImage.file);

      const result = await detectChanges(beforeImageData, afterImageData);
      setAnalysisResult(result);

      toast({
        title: "Analysis Complete",
        description: `Detected changes in ${result.changePercentage.toFixed(1)}% of the area`,
      });

      // Save to backend (MongoDB if configured)
      try {
        const [beforeB64, afterB64] = await Promise.all([
          fileToBase64(beforeImage.file),
          fileToBase64(afterImage.file)
        ])
        await fetch('/api/detections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            createdAt: new Date().toISOString(),
            beforeImageBase64: beforeB64,
            afterImageBase64: afterB64,
            overlayImageBase64: '',
            width: beforeImageData.width,
            height: beforeImageData.height,
            changePixels: Math.round(result.changePercentage / 100 * (beforeImageData.width * beforeImageData.height)),
            totalPixels: beforeImageData.width * beforeImageData.height,
            severity: result.changedAreas[0]?.confidence ?? 0,
            threshold: 0,
            coordinates: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
            model: { type: 'browser-change-detection', version: '1.0' }
          })
        })
      } catch (e) {
        console.warn('Save detection failed (continuing):', e)
      }
    } catch (err) {
      console.error('Prediction error:', err);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

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
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const UploadArea = ({ type, image }: { type: 'before' | 'after', image: UploadedImage | null }) => (
    <div className="relative">
      {image ? (
        <div className="relative group">
          <img
            src={image.preview}
            alt={`${type} image`}
            className="w-full h-64 object-cover rounded-lg border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeImage(type)}
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
          <Badge className="absolute top-2 left-2 bg-primary">
            {type === 'before' ? 'Before' : 'After'}
          </Badge>
        </div>
      ) : (
        <div
          className="h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer"
          onDrop={(e) => handleDrop(e, type)}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Upload {type} image</p>
          <p className="text-sm text-center mb-4">Drag & drop or click to select</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileInput(e, type)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button variant="outline" size="sm">
            <ImageIcon className="w-4 h-4 mr-2" />
            Select Image
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b bg-gradient-earth text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">AI Land Change Detection</h3>
            <p className="text-sm opacity-90 mt-1">Upload before and after images for automated analysis</p>
          </div>
          <Badge variant="outline" className="border-primary-foreground/20 text-primary-foreground">
            <Zap className="w-3 h-3 mr-1" />
            99% Accuracy
          </Badge>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Image Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Before Image</h4>
            <UploadArea type="before" image={beforeImage} />
          </div>
          <div>
            <h4 className="font-medium mb-3">After Image</h4>
            <UploadArea type="after" image={afterImage} />
          </div>
        </div>

        {/* Status and Analyze Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {!modelLoaded ? 'Loading AI model…' : (beforeImage && afterImage ? 'Ready for analysis' : `${beforeImage ? '1' : '0'}/2 images uploaded`)}
          </div>
          <Button
            onClick={runAnalysis}
            disabled={!beforeImage || !afterImage || isAnalyzing || !modelLoaded}
            className="relative"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Scan className="w-4 h-4 mr-2" />
                Analyze Changes
              </>
            )}
          </Button>
        </div>

        {/* Results */
        }
        {analysisResult && (
          <div className="space-y-6 pt-6 border-t">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <h4 className="text-lg font-semibold">Analysis Results</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-muted">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Severity</div>
                  <div className={`text-xl font-bold ${
                    analysisResult.changedAreas[0]?.type === 'severe' ? 'text-destructive' :
                    analysisResult.changedAreas[0]?.type === 'moderate' ? 'text-warning' :
                    analysisResult.changedAreas[0]?.type === 'minor' ? 'text-yellow-600' :
                    'text-success'
                  }`}>
                    {analysisResult.changedAreas[0]?.type ? (
                      analysisResult.changedAreas[0].type.charAt(0).toUpperCase() + analysisResult.changedAreas[0].type.slice(1)
                    ) : 'None'}
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-muted">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Confidence</div>
                  <div className="text-xl font-bold">
                    {analysisResult.changedAreas[0] ? (analysisResult.changedAreas[0].confidence * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-muted">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Affected Area</div>
                  <div className="text-xl font-bold">
                    {analysisResult.changePercentage.toFixed(1)}%
                  </div>
                </div>
              </Card>
            </div>

            {/* Map (Google Maps embed) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Location (optional)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="Latitude"
                  className="border rounded px-3 py-2"
                  value={coords?.lat ?? ''}
                  onChange={(e) => setCoords({ lat: Number(e.target.value), lng: coords?.lng ?? 0 })}
                />
                <input
                  placeholder="Longitude"
                  className="border rounded px-3 py-2"
                  value={coords?.lng ?? ''}
                  onChange={(e) => setCoords({ lat: coords?.lat ?? 0, lng: Number(e.target.value) })}
                />
              </div>
              {coords && !Number.isNaN(coords.lat) && !Number.isNaN(coords.lng) && (
                <iframe
                  title="map"
                  className="w-full h-64 rounded border"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=12&output=embed`}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={async () => {
                try {
                  const { jsPDF } = await import('jspdf')
                  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
                  const yStart = 40
                  doc.setFontSize(16)
                  doc.text('Mining Activity Change Detection Report', 40, yStart)
                  doc.setFontSize(11)
                  doc.text(`Date: ${new Date().toLocaleString()}`, 40, yStart + 20)
                  doc.text(`Affected Area: ${analysisResult.changePercentage.toFixed(1)}%`, 40, yStart + 40)
                  const conf = analysisResult.changedAreas[0] ? `${(analysisResult.changedAreas[0].confidence * 100).toFixed(1)}%` : 'N/A'
                  doc.text(`Top Change Confidence: ${conf}`, 40, yStart + 60)
                  if (coords) {
                    doc.text(`Location: ${coords.lat}, ${coords.lng}`, 40, yStart + 80)
                  }
                  doc.save('change-detection-report.pdf')
                } catch (e) {
                  toast({ title: 'Export failed', description: 'Could not generate PDF', variant: 'destructive' })
                }
              }}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="destructive">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Send Alert
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}