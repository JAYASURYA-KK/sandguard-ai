import tensorflow as tf
from tensorflow.keras import layers, Model
import numpy as np
import os
from PIL import Image
import pandas as pd
from sklearn.model_selection import train_test_split

def create_siamese_model(input_shape=(256, 256, 3)):
    # Enhanced CNN for feature extraction with ResNet-like blocks
    def create_base_network():
        inputs = layers.Input(shape=input_shape)
        
        # Initial convolution
        x = layers.Conv2D(64, (7, 7), strides=(2, 2), padding='same')(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.Activation('relu')(x)
        x = layers.MaxPooling2D((3, 3), strides=(2, 2), padding='same')(x)
        
        # Residual blocks
        def residual_block(x, filters, stride=1):
            shortcut = x
            
            x = layers.Conv2D(filters, (3, 3), strides=stride, padding='same')(x)
            x = layers.BatchNormalization()(x)
            x = layers.Activation('relu')(x)
            
            x = layers.Conv2D(filters, (3, 3), padding='same')(x)
            x = layers.BatchNormalization()(x)
            
            if stride != 1 or shortcut.shape[-1] != filters:
                shortcut = layers.Conv2D(filters, (1, 1), strides=stride, padding='same')(shortcut)
                shortcut = layers.BatchNormalization()(shortcut)
            
            x = layers.Add()([x, shortcut])
            x = layers.Activation('relu')(x)
            return x
        
        # Add residual blocks
        x = residual_block(x, 64)
        x = residual_block(x, 128, stride=2)
        x = residual_block(x, 256, stride=2)
        
        # Global average pooling
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dense(256, activation='relu')(x)
        x = layers.Dropout(0.5)(x)
        
        return Model(inputs, x)

    base_network = create_base_network()
    
    # Input layers for before and after images
    input_before = layers.Input(shape=input_shape)
    input_after = layers.Input(shape=input_shape)
    
    # Get embeddings
    embedding_before = base_network(input_before)
    embedding_after = base_network(input_after)
    
    # Combine embeddings
    x = layers.Concatenate()([embedding_before, embedding_after])
    x = layers.Dense(64, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(1, activation='sigmoid')(x)
    
    return Model(inputs=[input_before, input_after], outputs=outputs)

def load_and_preprocess_image(image_path, target_size=(256, 256)):
    img = Image.open(image_path)
    img = img.resize(target_size)
    img_array = np.array(img) / 255.0
    return img_array

def prepare_dataset(data_dir, labels_file):
    df = pd.read_csv(labels_file)
    
    before_images = []
    after_images = []
    labels = []
    
    for _, row in df.iterrows():
        before_path = os.path.join(data_dir, row['before_image'])
        after_path = os.path.join(data_dir, row['after_image'])
        
        if os.path.exists(before_path) and os.path.exists(after_path):
            before_img = load_and_preprocess_image(before_path)
            after_img = load_and_preprocess_image(after_path)
            
            before_images.append(before_img)
            after_images.append(after_img)
            labels.append(row['is_mining'])
    
    return np.array(before_images), np.array(after_images), np.array(labels)

def train_model(train_dir, val_dir, labels_file, epochs=50):
    # Prepare datasets
    before_train, after_train, labels_train = prepare_dataset(train_dir, labels_file)
    before_val, after_val, labels_val = prepare_dataset(val_dir, labels_file)
    
    # Create and compile model
    model = create_siamese_model()
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.Precision(), tf.keras.metrics.Recall()]
    )
    
    # Create callbacks
    checkpoint_cb = tf.keras.callbacks.ModelCheckpoint(
        'best_model.h5',
        save_best_only=True,
        monitor='val_accuracy'
    )
    early_stopping_cb = tf.keras.callbacks.EarlyStopping(
        monitor='val_accuracy',
        patience=10,
        restore_best_weights=True
    )
    
    # Train model
    history = model.fit(
        [before_train, after_train],
        labels_train,
        validation_data=([before_val, after_val], labels_val),
        epochs=epochs,
        batch_size=32,
        callbacks=[checkpoint_cb, early_stopping_cb]
    )
    
    return model, history

def evaluate_model(model, test_dir, labels_file):
    before_test, after_test, labels_test = prepare_dataset(test_dir, labels_file)
    
    results = model.evaluate(
        [before_test, after_test],
        labels_test,
        verbose=1
    )
    
    print("Test Results:")
    print(f"Loss: {results[0]:.4f}")
    print(f"Accuracy: {results[1]:.4f}")
    print(f"Precision: {results[2]:.4f}")
    print(f"Recall: {results[3]:.4f}")
    
    return results

if __name__ == "__main__":
    # Set random seed for reproducibility
    tf.random.set_seed(42)
    np.random.seed(42)
    
    # Paths
    BASE_DIR = "data"
    TRAIN_DIR = os.path.join(BASE_DIR, "train")
    VAL_DIR = os.path.join(BASE_DIR, "val")
    TEST_DIR = os.path.join(BASE_DIR, "test")
    LABELS_FILE = os.path.join(BASE_DIR, "labels.csv")
    
    # Train model
    model, history = train_model(TRAIN_DIR, VAL_DIR, LABELS_FILE)
    
    # Evaluate on test set
    test_results = evaluate_model(model, TEST_DIR, LABELS_FILE)
    
    # Save the final model
    model.save('mining_detector_model.h5')
