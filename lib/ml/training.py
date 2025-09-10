import tensorflow as tf
import numpy as np
from pathlib import Path
import cv2
from sklearn.model_selection import train_test_split
import albumentations as A

def create_siamese_model():
    """Create a Siamese network for change detection"""
    def create_base_network():
        inputs = tf.keras.layers.Input(shape=(256, 256, 3))
        x = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same')(inputs)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.MaxPooling2D((2, 2))(x)
        
        x = tf.keras.layers.Conv2D(128, (3, 3), activation='relu', padding='same')(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.MaxPooling2D((2, 2))(x)
        
        x = tf.keras.layers.Conv2D(256, (3, 3), activation='relu', padding='same')(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.MaxPooling2D((2, 2))(x)
        
        x = tf.keras.layers.Conv2D(512, (3, 3), activation='relu', padding='same')(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        return tf.keras.Model(inputs=inputs, outputs=x)
    
    base_network = create_base_network()
    
    input_a = tf.keras.layers.Input(shape=(256, 256, 3))
    input_b = tf.keras.layers.Input(shape=(256, 256, 3))
    
    processed_a = base_network(input_a)
    processed_b = base_network(input_b)
    
    # Compute difference features
    difference = tf.keras.layers.Subtract()([processed_a, processed_b])
    
    # Final classification layers
    x = tf.keras.layers.Dense(256, activation='relu')(difference)
    x = tf.keras.layers.Dropout(0.5)(x)
    x = tf.keras.layers.Dense(128, activation='relu')(x)
    x = tf.keras.layers.Dropout(0.5)(x)
    outputs = tf.keras.layers.Dense(1, activation='sigmoid')(x)
    
    return tf.keras.Model(inputs=[input_a, input_b], outputs=outputs)

def create_dataset(image_pairs, labels, batch_size=32, augment=False):
    """Create a TensorFlow dataset from image pairs"""
    
    def load_and_preprocess_images(before_path, after_path, label):
        # Read images
        def read_image(path):
            img = tf.io.read_file(path)
            img = tf.image.decode_png(img, channels=3)
            img = tf.image.resize(img, [256, 256])
            img = tf.cast(img, tf.float32) / 255.0
            return img
        
        before_img = read_image(before_path)
        after_img = read_image(after_path)
        
        if augment:
            # Apply random augmentations
            if tf.random.uniform([]) > 0.5:
                before_img = tf.image.random_brightness(before_img, 0.2)
                after_img = tf.image.random_brightness(after_img, 0.2)
            
            if tf.random.uniform([]) > 0.5:
                before_img = tf.image.random_contrast(before_img, 0.8, 1.2)
                after_img = tf.image.random_contrast(after_img, 0.8, 1.2)
            
            if tf.random.uniform([]) > 0.5:
                before_img = tf.image.random_saturation(before_img, 0.8, 1.2)
                after_img = tf.image.random_saturation(after_img, 0.8, 1.2)
        
        return (before_img, after_img), label
    
    # Create dataset from pairs and labels
    before_paths = tf.constant([pair[0] for pair in image_pairs])
    after_paths = tf.constant([pair[1] for pair in image_pairs])
    labels = tf.constant(labels, dtype=tf.float32)
    
    dataset = tf.data.Dataset.from_tensor_slices((before_paths, after_paths, labels))
    
    # Apply preprocessing
    dataset = dataset.map(
        load_and_preprocess_images,
        num_parallel_calls=tf.data.AUTOTUNE
    )
    
    # Shuffle, batch, and prefetch
    if augment:
        dataset = dataset.shuffle(buffer_size=len(image_pairs))
    
    dataset = dataset.batch(batch_size)
    dataset = dataset.prefetch(tf.data.AUTOTUNE)
    
    return dataset

def train_model(train_dir, val_dir, epochs=50):
    # Load and prepare data
    def load_image_pairs(data_dir):
        data_dir = Path(data_dir)
        before_dir = data_dir / 'A'
        after_dir = data_dir / 'B'
        label_dir = data_dir / 'label'
        
        image_pairs = []
        labels = []
        
        for label_path in label_dir.glob('*.png'):
            img_id = label_path.stem
            before_path = before_dir / f"{img_id}.png"
            after_path = after_dir / f"{img_id}.png"
            
            if before_path.exists() and after_path.exists():
                image_pairs.append((str(before_path), str(after_path)))
                
                # Read label image and determine if there's change
                label_img = cv2.imread(str(label_path), cv2.IMREAD_GRAYSCALE)
                has_change = np.mean(label_img) > 10  # Threshold for determining change
                labels.append(1.0 if has_change else 0.0)
        
        return np.array(image_pairs), np.array(labels)
    
    # Load training and validation data
    train_pairs, train_labels = load_image_pairs(train_dir)
    val_pairs, val_labels = load_image_pairs(val_dir)
    
    # Create datasets using tf.data
    train_dataset = create_dataset(train_pairs, train_labels, batch_size=16, augment=True)
    val_dataset = create_dataset(val_pairs, val_labels, batch_size=16, augment=False)
    
    # Create and compile model
    model = create_siamese_model()
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-4),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.AUC()]
    )
    
    # Callbacks
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            'best_model.keras',
            monitor='val_auc',
            mode='max',
            save_best_only=True,
            verbose=1,
            save_format='keras'
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        )
    ]
    
    # Train the model
    history = model.fit(
        train_dataset,
        validation_data=val_dataset,
        epochs=epochs,
        callbacks=callbacks
    )
    
    return model, history

if __name__ == "__main__":
    # Train the model
    model, history = train_model('train', 'val')
