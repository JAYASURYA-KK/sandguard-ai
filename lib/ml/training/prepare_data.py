import os
import pandas as pd
import shutil
from sklearn.model_selection import train_test_split
from PIL import Image
import numpy as np

def create_dataset_structure():
    """Create the necessary directories for the dataset."""
    base_dir = 'data'
    subdirs = ['train', 'test', 'val']
    
    for subdir in subdirs:
        dir_path = os.path.join(base_dir, subdir)
        os.makedirs(dir_path, exist_ok=True)
        print(f"Created directory: {dir_path}")

def prepare_labels_file(source_dir):
    """Create a labels CSV file from the source directory structure."""
    data = []
    
    # Walk through the source directory
    for root, _, files in os.walk(source_dir):
        image_files = [f for f in files if f.endswith(('.jpg', '.png', '.jpeg'))]
        
        for img_file in image_files:
            if img_file.startswith('before_'):
                # Find corresponding after image
                after_file = img_file.replace('before_', 'after_')
                if after_file in image_files:
                    # Check if this is a mining site based on directory structure
                    is_mining = 1 if 'mining' in root.lower() else 0
                    
                    data.append({
                        'before_image': img_file,
                        'after_image': after_file,
                        'is_mining': is_mining,
                        'source_dir': root
                    })
    
    # Create DataFrame and save to CSV
    df = pd.DataFrame(data)
    df.to_csv('data/labels.csv', index=False)
    print(f"Created labels file with {len(df)} pairs")
    return df

def split_and_copy_data(df, train_size=0.7, val_size=0.15):
    """Split the dataset and copy files to appropriate directories."""
    # First split: train and temp
    train_df, temp_df = train_test_split(df, train_size=train_size, random_state=42)
    
    # Second split: val and test from temp
    val_size_adjusted = val_size / (1 - train_size)
    val_df, test_df = train_test_split(temp_df, train_size=val_size_adjusted, random_state=42)
    
    # Copy files to respective directories
    for subset_df, subset_name in [(train_df, 'train'), (val_df, 'val'), (test_df, 'test')]:
        target_dir = os.path.join('data', subset_name)
        
        for _, row in subset_df.iterrows():
            # Copy before image
            shutil.copy2(
                os.path.join(row['source_dir'], row['before_image']),
                os.path.join(target_dir, row['before_image'])
            )
            
            # Copy after image
            shutil.copy2(
                os.path.join(row['source_dir'], row['after_image']),
                os.path.join(target_dir, row['after_image'])
            )
        
        print(f"Copied {len(subset_df)} pairs to {subset_name} directory")

def validate_images():
    """Validate all images in the dataset."""
    base_dir = 'data'
    for subset in ['train', 'test', 'val']:
        dir_path = os.path.join(base_dir, subset)
        print(f"\nValidating images in {subset} set:")
        
        for img_file in os.listdir(dir_path):
            if img_file.endswith(('.jpg', '.png', '.jpeg')):
                img_path = os.path.join(dir_path, img_file)
                try:
                    with Image.open(img_path) as img:
                        img.verify()
                    print(f"✓ {img_file}")
                except Exception as e:
                    print(f"✗ {img_file}: {str(e)}")

def preprocess_images(target_size=(256, 256)):
    """Preprocess all images to the same size."""
    base_dir = 'data'
    for subset in ['train', 'test', 'val']:
        dir_path = os.path.join(base_dir, subset)
        print(f"\nPreprocessing images in {subset} set:")
        
        for img_file in os.listdir(dir_path):
            if img_file.endswith(('.jpg', '.png', '.jpeg')):
                img_path = os.path.join(dir_path, img_file)
                try:
                    # Open and resize image
                    img = Image.open(img_path)
                    img = img.resize(target_size)
                    
                    # Save preprocessed image
                    img.save(img_path)
                    print(f"✓ {img_file}")
                except Exception as e:
                    print(f"✗ {img_file}: {str(e)}")

if __name__ == "__main__":
    # Create directory structure
    create_dataset_structure()
    
    # Prepare labels file from source directory
    source_dir = input("Enter the path to your source image directory: ")
    df = prepare_labels_file(source_dir)
    
    # Split and copy data
    split_and_copy_data(df)
    
    # Validate images
    validate_images()
    
    # Preprocess images
    preprocess_images()
