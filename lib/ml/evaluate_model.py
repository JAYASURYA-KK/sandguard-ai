import tensorflow as tf
import numpy as np
import os
from pathlib import Path
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt
from inference import MiningDetector

def evaluate_model_performance():
    """Evaluate model performance on test set"""
    # Initialize detector
    detector = MiningDetector('best_model.h5')
    
    # Warmup prediction to build metrics
    warmup_tensor = tf.zeros((1, 256, 256, 3))
    detector.model.predict([warmup_tensor, warmup_tensor], verbose=0)
    
    # Load test data
    test_dir = Path('test')
    before_dir = test_dir / 'A'
    after_dir = test_dir / 'B'
    label_dir = test_dir / 'label'
    
    test_pairs = []
    true_labels = []
    predictions = []
    
    # Collect test samples
    for label_path in label_dir.glob('*.png'):
        img_id = label_path.stem
        before_path = before_dir / f"{img_id}.png"
        after_path = after_dir / f"{img_id}.png"
        
        if before_path.exists() and after_path.exists():
            # Get ground truth
            label_img = tf.io.read_file(str(label_path))
            label_img = tf.image.decode_png(label_img, channels=1)
            has_change = tf.reduce_mean(tf.cast(label_img, tf.float32)) > 10
            true_labels.append(float(has_change))
            
            # Get prediction
            result = detector.detect_changes(str(before_path), str(after_path))
            predictions.append(1 if result['confidence'] > detector.confidence_threshold else 0)
            
            test_pairs.append((str(before_path), str(after_path)))
    
    # Convert to numpy arrays
    true_labels = np.array(true_labels)
    predictions = np.array(predictions)
    
    # Print overall statistics
    print(f"\nTotal test samples: {len(true_labels)}")
    print(f"Positive samples (with changes): {sum(true_labels)}")
    print(f"Negative samples (no changes): {len(true_labels) - sum(true_labels)}")
    
    # Print classification report
    print("\nClassification Report:")
    report = classification_report(true_labels, predictions, target_names=['No Change', 'Change'])
    print(report)
    
    # Save report to file
    with open('evaluation_report.txt', 'w') as f:
        f.write("Model Evaluation Report\n")
        f.write("=====================\n\n")
        f.write(f"Total test samples: {len(true_labels)}\n")
        f.write(f"Positive samples (with changes): {sum(true_labels)}\n")
        f.write(f"Negative samples (no changes): {len(true_labels) - sum(true_labels)}\n\n")
        f.write("Classification Report:\n")
        f.write(report)
    
    # Plot confusion matrix
    cm = confusion_matrix(true_labels, predictions)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['No Change', 'Change'],
                yticklabels=['No Change', 'Change'])
    plt.title('Confusion Matrix for Mining Change Detection')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png')
    plt.close()
    
    # Print some detailed examples
    print("\nDetailed Examples:")
    for (before_path, after_path), true_label, pred in zip(test_pairs[:5], true_labels[:5], predictions[:5]):
        result = detector.detect_changes(before_path, after_path)
        print(f"\nImage Pair: {os.path.basename(before_path)} -> {os.path.basename(after_path)}")
        print(f"True Label: {'Change' if true_label else 'No Change'}")
        print(f"Predicted: {'Change' if pred else 'No Change'}")
        print(f"Confidence: {result['confidence']:.3f}")
        print(f"Affected Area: {result['affected_area']:.3f}")
        print(f"Severity: {result['severity']}")
        print(f"Prediction Uncertainty: {result['prediction_std']:.3f}")

if __name__ == "__main__":
    evaluate_model_performance()
