# type: ignore
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers  # type: ignore
from tensorflow.keras.preprocessing import image_dataset_from_directory  # type: ignore
from tensorflow.keras.applications import MobileNetV2  # type: ignore
import numpy as np
import matplotlib.pyplot as plt
import cv2
import argparse

DATASET_PATH = r"C:\Users\Loor Ibrahim\Desktop\Zaad\Zaad_Applications\ai-services\cooked_detection\dataset"
MODEL_SAVE_PATH = "cooked_detection_model.h5"
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 10
VALIDATION_SPLIT = 0.2

class CookedDetectionModel:
    def __init__(self, dataset_path=DATASET_PATH):
        self.dataset_path = dataset_path
        self.model = None
        self.history = None
        self.train_ds = None
        self.val_ds = None
        
    def load_data(self):
        """Load dataset from cooked/notcooked directories"""
        print("Loading dataset...")
        
        self.train_ds = image_dataset_from_directory(
            self.dataset_path,
            seed=123,
            image_size=IMAGE_SIZE,
            batch_size=BATCH_SIZE,
            validation_split=VALIDATION_SPLIT,
            subset="training",
            label_mode="binary"
        )
        
        self.val_ds = image_dataset_from_directory(
            self.dataset_path,
            seed=123,
            image_size=IMAGE_SIZE,
            batch_size=BATCH_SIZE,
            validation_split=VALIDATION_SPLIT,
            subset="validation",
            label_mode="binary"
        )
        
        data_augmentation = keras.Sequential([
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.1),
            layers.RandomZoom(0.1),
        ])
        
        self.train_ds = self.train_ds.map(
            lambda x, y: (data_augmentation(x), y),
            num_parallel_calls=tf.data.AUTOTUNE
        )
        
        normalization_layer = layers.Rescaling(1./255)
        self.train_ds = self.train_ds.map(
            lambda x, y: (normalization_layer(x), y),
            num_parallel_calls=tf.data.AUTOTUNE
        )
        self.val_ds = self.val_ds.map(
            lambda x, y: (normalization_layer(x), y),
            num_parallel_calls=tf.data.AUTOTUNE
        )
        
        self.train_ds = self.train_ds.prefetch(tf.data.AUTOTUNE)
        self.val_ds = self.val_ds.prefetch(tf.data.AUTOTUNE)
        
        print("Dataset loaded!")
        
    def build_model(self):
        """Build model with MobileNetV2"""
        print("Building model...")
        
        base_model = MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights='imagenet'
        )
        
        base_model.trainable = False
        
        model = keras.Sequential([
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.5),
            layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=1e-4),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        self.model = model
        print("Model built!")
        
    def train(self, epochs=EPOCHS):
        """Train the model"""
        print(f"Training for {epochs} epochs...")
        
        early_stopping = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=2,
            restore_best_weights=True
        )
        
        checkpoint = keras.callbacks.ModelCheckpoint(
            "best_cooked_detection_model.h5",
            monitor='val_accuracy',
            save_best_only=True
        )
        
        self.history = self.model.fit(
            self.train_ds,
            validation_data=self.val_ds,
            epochs=epochs,
            callbacks=[early_stopping, checkpoint],
            verbose=1
        )
        
        self.model.save(MODEL_SAVE_PATH)
        print(f"Model saved to {MODEL_SAVE_PATH}")
        
    def evaluate(self):
        """Evaluate model"""
        print("Evaluating...")
        results = self.model.evaluate(self.val_ds, verbose=0)
        print(f"Validation Loss: {results[0]:.4f}")
        print(f"Validation Accuracy: {results[1]:.4f}")
        
    def plot_training_history(self):
        """Plot training history"""
        if self.history is None:
            return
        
        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        
        axes[0].plot(self.history.history['accuracy'], label='Train')
        axes[0].plot(self.history.history['val_accuracy'], label='Validation')
        axes[0].set_title('Accuracy')
        axes[0].set_ylabel('Accuracy')
        axes[0].set_xlabel('Epoch')
        axes[0].legend()
        axes[0].grid(True)
        
        axes[1].plot(self.history.history['loss'], label='Train')
        axes[1].plot(self.history.history['val_loss'], label='Validation')
        axes[1].set_title('Loss')
        axes[1].set_ylabel('Loss')
        axes[1].set_xlabel('Epoch')
        axes[1].legend()
        axes[1].grid(True)
        
        plt.tight_layout()
        plt.savefig('training_history_cooked.png', dpi=150)
        print("Training history saved!")
        plt.close()
        
    def predict(self, image_path):
        """Predict on image"""
        if self.model is None:
            raise ValueError("Model not loaded!")
        
        img = keras.preprocessing.image.load_img(image_path, target_size=IMAGE_SIZE)
        img_array = keras.preprocessing.image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array /= 255.0
        
        prediction = self.model.predict(img_array, verbose=0)[0][0]
        # Labels are: 0=cooked (alphabetically first), 1=notcooked
        # So low score = cooked, high score = not cooked
        label = "NOT COOKED" if prediction > 0.5 else "COOKED"
        confidence = prediction if prediction > 0.5 else 1 - prediction
        
        return {"label": label, "confidence": float(confidence), "raw_score": float(prediction)}
    
    def load_trained_model(self, model_path=MODEL_SAVE_PATH):
        """Load trained model"""
        print(f"Loading model...")
        self.model = keras.models.load_model(model_path)
        print("Model loaded!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train or load Cooked vs Packaged model")
    parser.add_argument("--force-train", action="store_true", help="Ignore existing best model and retrain")
    args = parser.parse_args()

    detector = CookedDetectionModel()

    # Check if model already exists, allow forcing retrain
    if os.path.exists("best_cooked_detection_model.h5") and not args.force_train:
        print("Loading existing best model...")
        detector.load_trained_model("best_cooked_detection_model.h5")
        print("\nModel already trained. To retrain with new data, run: python model.py --force-train")
    else:
        detector.load_data()
        detector.build_model()
        detector.train(epochs=EPOCHS)
        detector.evaluate()
        detector.plot_training_history()
        print("\nTraining complete! Best model saved to best_cooked_detection_model.h5")
    