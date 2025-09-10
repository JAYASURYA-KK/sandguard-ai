import tensorflow as tf
import numpy as np
import cv2
from pathlib import Path
from typing import Tuple, Dict, Any, Union
from PIL import Image

class MiningDetector:
    def __init__(self, model_path: str | None = None):
        """Initialize the mining detector with a trained model.

        Tries to load `best_model.keras` first (matching training), then falls back to `best_model.h5`.
        """
        # Resolve model path candidates
        candidate_paths = []
        if model_path:
            candidate_paths.append(model_path)
        candidate_paths.extend([
            'best_model.keras',
            'best_model.h5',
        ])

        loaded = None
        last_err: Exception | None = None
        for path in candidate_paths:
            try:
                if Path(path).exists():
                    loaded = tf.keras.models.load_model(path, compile=False)
                    break
            except Exception as e:
                last_err = e
                continue

        if loaded is None:
            raise FileNotFoundError(f"No trained model found. Tried: {candidate_paths}. Last error: {last_err}")

        self.model = loaded

        # Compile model with the same metrics used during training
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(1e-4),
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.AUC(name='auc')],
        )

        self.input_shape = (256, 256)
        # Set thresholds based on validation results
        self.confidence_threshold = 0.65  # Base confidence threshold
        self.change_area_threshold = 0.1  # Minimum area for significant change
        self.high_confidence_threshold = 0.8  # Threshold for severe changes
        
    def preprocess_image(self, image: Union[str, np.ndarray, Image.Image]) -> np.ndarray:
        """
        Preprocess an image for model input.
        
        Args:
            image: Can be a file path, numpy array, or PIL Image
            
        Returns:
            Preprocessed image as numpy array
        """
        if isinstance(image, str):
            img = cv2.imread(image)
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        elif isinstance(image, np.ndarray):
            if image.ndim == 2:  # Grayscale
                img = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            else:
                if image.shape[2] == 4:  # RGBA
                    img = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
                else:
                    img = image.copy()
        elif isinstance(image, Image.Image):
            img = np.array(image)
            if img.shape[2] == 4:  # RGBA
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
        else:
            raise ValueError("Unsupported image type")

        # Resize to training input size and normalize to [0, 1]
        img = cv2.resize(img, self.input_shape, interpolation=cv2.INTER_AREA)
        img = img.astype(np.float32) / 255.0
        
        return img

    def detect_changes(
        self, 
        before_path: str, 
        after_path: str,
        return_heatmap: bool = True
    ) -> Dict[str, Any]:
        """
        Detect mining-related changes between two images.
        
        Args:
            before_path: Path to the before image
            after_path: Path to the after image
            return_heatmap: Whether to return the change heatmap
            
        Returns:
            Dictionary containing detection results:
            - confidence: probability of mining activity
            - heatmap: change heatmap (if return_heatmap=True)
            - affected_area: percentage of area affected
            - severity: categorical assessment of change severity
        """
        # Preprocess images
        before_img = self.preprocess_image(before_path)
        after_img = self.preprocess_image(after_path)
        
        # Add batch dimension
        before_batch = np.expand_dims(before_img, axis=0)
        after_batch = np.expand_dims(after_img, axis=0)
        
        # Make multiple predictions with different augmentations for robust results
        predictions = []
        for _ in range(5):  # Ensemble predictions
            # Apply slight augmentation
            if _ > 0:  # Skip augmentation for first prediction
                before_aug = tf.image.random_brightness(before_batch, 0.1)
                before_aug = tf.image.random_contrast(before_aug, 0.9, 1.1)
                after_aug = tf.image.random_brightness(after_batch, 0.1)
                after_aug = tf.image.random_contrast(after_aug, 0.9, 1.1)
            else:
                before_aug, after_aug = before_batch, after_batch
            
            pred = float(self.model.predict([before_aug, after_aug], verbose=0)[0][0])
            predictions.append(pred)
        
        # Use median prediction for robustness
        confidence = float(np.median(predictions))
        
        # Generate analysis
        result = {
            'confidence': confidence,
            'raw_predictions': predictions,
            'prediction_std': float(np.std(predictions)),  # Measure of prediction uncertainty
            'affected_area': 0.0,
            'severity': 'none'
        }
        
        if confidence > self.confidence_threshold:  # If change detected with high confidence
            # Compute difference heatmap
            if return_heatmap:
                diff = cv2.absdiff(
                    (before_img * 255).astype(np.uint8),
                    (after_img * 255).astype(np.uint8)
                )
                diff = cv2.cvtColor(diff, cv2.COLOR_RGB2GRAY)
                diff = cv2.GaussianBlur(diff, (5, 5), 0)
                
                # Threshold to identify significant changes
                _, thresh = cv2.threshold(
                    diff, 
                    30,  # Threshold value
                    255,
                    cv2.THRESH_BINARY
                )
                
                # Calculate affected area
                affected_pixels = np.count_nonzero(thresh)
                total_pixels = thresh.size
                affected_area = affected_pixels / total_pixels
                
                result['affected_area'] = float(affected_area)
                result['heatmap'] = thresh
                
                # Determine severity
                if affected_area < 0.1:
                    result['severity'] = 'minor'
                elif affected_area < 0.3:
                    result['severity'] = 'moderate'
                else:
                    result['severity'] = 'severe'
        
        return result
        
        return prediction, analysis

    def _generate_heatmap(
        self, 
        before_img: np.ndarray, 
        after_img: np.ndarray
    ) -> np.ndarray:
        """Generate a heatmap showing areas of change."""
        # Convert to grayscale
        before_gray = cv2.cvtColor(
            (before_img * 255).astype(np.uint8), 
            cv2.COLOR_RGB2GRAY
        )
        after_gray = cv2.cvtColor(
            (after_img * 255).astype(np.uint8), 
            cv2.COLOR_RGB2GRAY
        )
        
        # Calculate absolute difference
        diff = cv2.absdiff(before_gray, after_gray)
        
        # Apply threshold
        _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
        
        # Apply Gaussian blur to smooth the result
        heatmap = cv2.GaussianBlur(thresh, (5, 5), 0)
        
        return heatmap

    def _analyze_changes(
        self, 
        heatmap: np.ndarray, 
        prediction: float
    ) -> Dict[str, Any]:
        """Analyze the changes and provide detailed information."""
        # Find contours of changed regions
        contours, _ = cv2.findContours(
            heatmap.astype(np.uint8), 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        # Calculate changed areas
        changed_areas = []
        total_area = heatmap.shape[0] * heatmap.shape[1]
        change_area = 0
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 100:  # Filter out small changes
                x, y, w, h = cv2.boundingRect(contour)
                changed_areas.append({
                    'bbox': [x, y, x + w, y + h],
                    'area': area,
                    'confidence': float(prediction)
                })
                change_area += area
        
        return {
            'changed_areas': changed_areas,
            'change_percentage': (change_area / total_area) * 100,
            'confidence': float(prediction),
            'severity': self._calculate_severity(prediction, change_area / total_area)
        }

    def _calculate_severity(self, confidence: float, change_ratio: float) -> str:
        """Calculate severity level based on confidence and change ratio."""
        severity_score = confidence * change_ratio
        
        if severity_score > 0.5:
            return 'high'
        elif severity_score > 0.2:
            return 'medium'
        else:
            return 'low'

# Example usage
if __name__ == "__main__":
    detector = MiningDetector('mining_detector_model.h5')
    
    # Example paths
    before_path = "path/to/before/image.jpg"
    after_path = "path/to/after/image.jpg"
    
    # Detect changes
    confidence, analysis = detector.detect_changes(before_path, after_path)
    
    print(f"Mining Detection Confidence: {confidence:.2%}")
    print("\nAnalysis:")
    print(f"Change Percentage: {analysis['change_percentage']:.2f}%")
    print(f"Severity: {analysis['severity']}")
    print(f"\nDetected Changes: {len(analysis['changed_areas'])}")
    for i, area in enumerate(analysis['changed_areas'], 1):
        print(f"\nArea {i}:")
        print(f"  Location: {area['bbox']}")
        print(f"  Size: {area['area']:.2f} pixels")
        print(f"  Confidence: {area['confidence']:.2%}")
