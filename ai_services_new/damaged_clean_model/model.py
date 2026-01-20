import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
import cv2
import os
from pathlib import Path


class CannedFoodInspector:
    """
    AI Model to detect damaged canned food
    Detects: Rust, Dents, Corrosion
    """
    
    def __init__(self, img_size=(224, 224)):
        self.img_size = img_size
        self.model = None
        self.class_names = ['good', 'damaged']
        
    def build_model(self):
        """
        Build CNN model for canned food inspection
        Uses transfer learning with MobileNetV2
        """
        # Load pre-trained MobileNetV2
        base_model = MobileNetV2(
            input_shape=(*self.img_size, 3),
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze base model layers
        base_model.trainable = False
        
        # Build custom model
        self.model = models.Sequential([
            # Data augmentation
            layers.RandomFlip('horizontal'),
            layers.RandomRotation(0.2),
            layers.RandomZoom(0.2),
            
            # Base model
            base_model,
            
            # Custom classification layers
            layers.GlobalAveragePooling2D(),
            layers.Dropout(0.3),
            layers.Dense(128, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.4),
            layers.Dense(64, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(1, activation='sigmoid')  # Binary classification
        ])
        
        # Compile model
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.0001),
            loss='binary_crossentropy',
            metrics=['accuracy', 
                    keras.metrics.Precision(),
                    keras.metrics.Recall()]
        )
        
        return self.model
    
    def build_custom_cnn(self):
        """
        Build custom CNN from scratch (alternative to transfer learning)
        """
        self.model = models.Sequential([
            # Input layer
            layers.Input(shape=(*self.img_size, 3)),
            
            # Data augmentation
            layers.RandomFlip('horizontal'),
            layers.RandomRotation(0.2),
            layers.RandomZoom(0.2),
            layers.RandomContrast(0.2),
            
            # Conv Block 1
            layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Conv Block 2
            layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Conv Block 3
            layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.Conv2D(128, (3, 3), activation='relu', padding='same'),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Conv Block 4
            layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
            layers.BatchNormalization(),
            layers.Conv2D(256, (3, 3), activation='relu', padding='same'),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            
            # Dense layers
            layers.Flatten(),
            layers.Dense(512, activation='relu'),
            layers.BatchNormalization(),
            layers.Dropout(0.5),
            layers.Dense(256, activation='relu'),
            layers.Dropout(0.4),
            layers.Dense(1, activation='sigmoid')
        ])
        
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy',
                    keras.metrics.Precision(),
                    keras.metrics.Recall()]
        )
        
        return self.model
    
    def preprocess_image(self, image_path):
        """
        Preprocess image for model input
        """
        # Read image
        if isinstance(image_path, str):
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not read image: {image_path}")
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        else:
            img = image_path
            
        # Resize
        img = cv2.resize(img, self.img_size)
        
        # Normalize
        img = img.astype('float32') / 255.0
        
        return img
    
    def train(self, train_dir, val_dir=None, epochs=50, batch_size=32):
        """
        Train the model
        
        Directory structure should be:
        train_dir/
            good/
                image1.jpg
                image2.jpg
            damaged/
                image1.jpg
                image2.jpg
        """
        # Data generators
        train_datagen = ImageDataGenerator(
            rescale=1./255,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            fill_mode='nearest'
        )
        
        val_datagen = ImageDataGenerator(rescale=1./255)
        
        # Load training data
        train_generator = train_datagen.flow_from_directory(
            train_dir,
            target_size=self.img_size,
            batch_size=batch_size,
            class_mode='binary',
            shuffle=True,
            classes=['good', 'damaged']  # ensure damaged=1, good=0
        )
        
        # Load validation data
        if val_dir:
            val_generator = val_datagen.flow_from_directory(
                val_dir,
                target_size=self.img_size,
                batch_size=batch_size,
                class_mode='binary',
                shuffle=False,
                classes=['good', 'damaged']
            )
        else:
            val_generator = None
        
        # Callbacks
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor='val_loss' if val_generator else 'loss',
                patience=10,
                restore_best_weights=True
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss' if val_generator else 'loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7
            ),
            keras.callbacks.ModelCheckpoint(
                'best_can_inspector_model.h5',
                monitor='val_loss' if val_generator else 'loss',
                save_best_only=True
            )
        ]
        
        # Train
        history = self.model.fit(
            train_generator,
            epochs=epochs,
            validation_data=val_generator,
            callbacks=callbacks
        )
        
        return history
    
    def train_from_directories(self, clean_dir, damaged_dir, epochs=50, batch_size=32, val_split=0.2):
        """
        Train the model from separate clean and damaged directories
        
        Args:
            clean_dir: Directory containing clean/good can images
            damaged_dir: Directory containing damaged can images
            epochs: Number of training epochs
            batch_size: Batch size for training
            val_split: Validation split ratio (0-1)
        """
        # Create temporary directory structure for training
        import shutil
        import tempfile
        
        temp_dir = tempfile.mkdtemp()
        train_dir = os.path.join(temp_dir, 'train')
        val_dir = os.path.join(temp_dir, 'val')
        
        try:
            # Create directory structure
            os.makedirs(os.path.join(train_dir, 'good'), exist_ok=True)
            os.makedirs(os.path.join(train_dir, 'damaged'), exist_ok=True)
            os.makedirs(os.path.join(val_dir, 'good'), exist_ok=True)
            os.makedirs(os.path.join(val_dir, 'damaged'), exist_ok=True)
            
            # Get list of images
            clean_images = [os.path.join(clean_dir, f) for f in os.listdir(clean_dir) 
                           if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
            damaged_images = [os.path.join(damaged_dir, f) for f in os.listdir(damaged_dir)
                             if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
            
            # Split into train and val
            import random
            random.shuffle(clean_images)
            random.shuffle(damaged_images)
            
            clean_split = int(len(clean_images) * (1 - val_split))
            damaged_split = int(len(damaged_images) * (1 - val_split))
            
            clean_train = clean_images[:clean_split]
            clean_val = clean_images[clean_split:]
            damaged_train = damaged_images[:damaged_split]
            damaged_val = damaged_images[damaged_split:]
            
            # Copy files to temporary structure
            for img in clean_train:
                shutil.copy2(img, os.path.join(train_dir, 'good'))
            for img in clean_val:
                shutil.copy2(img, os.path.join(val_dir, 'good'))
            for img in damaged_train:
                shutil.copy2(img, os.path.join(train_dir, 'damaged'))
            for img in damaged_val:
                shutil.copy2(img, os.path.join(val_dir, 'damaged'))
            
            print(f"📁 Training set: {len(clean_train)} clean, {len(damaged_train)} damaged")
            print(f"📁 Validation set: {len(clean_val)} clean, {len(damaged_val)} damaged\n")
            
            # Train using the standard train method
            history = self.train(train_dir, val_dir, epochs, batch_size)
            
            return history
            
        finally:
            # Clean up temporary directory
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
    
    def predict(self, image_path, threshold=0.30, focus_can=False):
        """
        Predict if a can is damaged or not
        
        Returns:
            result: 'good' or 'damaged'
            confidence: confidence score
            details: additional details about the prediction
        """
        if self.model is None:
            raise ValueError("Model not built or loaded!")
        
        # Preprocess image
        img = self.preprocess_image(image_path)
        img_batch = np.expand_dims(img, axis=0)
        
        # Predict
        prediction = self.model.predict(img_batch, verbose=0)[0][0]
        
        # Interpret results
        is_damaged = prediction >= threshold
        result = 'damaged' if is_damaged else 'good'
        confidence = prediction if is_damaged else (1 - prediction)
        
        # Analyze damage type (using edge detection and color analysis)
        damage_details = self._analyze_damage_type(image_path, focus_can=focus_can) if is_damaged else {}
        
        return {
            'result': result,
            'confidence': float(confidence),
            'damage_probability': float(prediction),
            'details': damage_details
        }
    
    def _analyze_damage_type(self, image_path, focus_can=False):
        """
        Analyze the type of damage (rust, dents, corrosion)
        Uses computer vision techniques
        """
        img = cv2.imread(image_path)
        if img is None:
            return {}
        
        damage_info = {
            'rust_detected': False,
            'dent_detected': False,
            'corrosion_detected': False
        }
        
        # Optionally focus analysis on detected can region
        can_mask = None
        if focus_can:
            can_mask = self._detect_can_mask(img)

        # Convert to different color spaces
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect rust (brownish/reddish colors)
        lower_rust = np.array([0, 40, 40])
        upper_rust = np.array([25, 255, 255])
        rust_mask = cv2.inRange(hsv, lower_rust, upper_rust)
        if can_mask is not None:
            rust_mask = cv2.bitwise_and(rust_mask, rust_mask, mask=can_mask)
        denom = np.sum(can_mask > 0) if can_mask is not None else rust_mask.size
        rust_percentage = (np.sum(rust_mask > 0) / max(1, denom)) * 100
        
        if rust_percentage > 2:  # If more than 2% is rust-colored
            damage_info['rust_detected'] = True
            damage_info['rust_percentage'] = float(rust_percentage)
        
        # Detect dents (using edge detection and contour analysis)
        edges = cv2.Canny(gray, 50, 150)
        if can_mask is not None:
            edges = cv2.bitwise_and(edges, edges, mask=can_mask)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Look for irregular shapes that might indicate dents
        irregular_contours = 0
        for contour in contours:
            if cv2.contourArea(contour) > 100:
                perimeter = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.04 * perimeter, True)
                if len(approx) > 6:  # Irregular shape
                    irregular_contours += 1
        
        if irregular_contours > 5:
            damage_info['dent_detected'] = True
            damage_info['irregular_shapes_count'] = irregular_contours
        
        # Detect corrosion (dark spots, discoloration)
        _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)
        if can_mask is not None:
            thresh = cv2.bitwise_and(thresh, thresh, mask=can_mask)
        denom_dark = np.sum(can_mask > 0) if can_mask is not None else thresh.size
        dark_percentage = (np.sum(thresh > 0) / max(1, denom_dark)) * 100
        
        if dark_percentage > 15:
            damage_info['corrosion_detected'] = True
            damage_info['dark_spots_percentage'] = float(dark_percentage)
        
        return damage_info

    def _detect_can_mask(self, img):
        """Detect circular/elliptical can region to limit analysis.
        Returns a binary mask (uint8 0/255). Fallback: entire image.
        """
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray_blur = cv2.GaussianBlur(gray, (9, 9), 2)

        mask = np.zeros((h, w), dtype=np.uint8)

        # Try HoughCircles for circular top-view cans
        circles = cv2.HoughCircles(gray_blur, cv2.HOUGH_GRADIENT, dp=1.2, minDist=min(h, w)//4,
                                   param1=100, param2=30,
                                   minRadius=min(h, w)//8, maxRadius=min(h, w)//2)
        if circles is not None:
            circles = np.uint16(np.around(circles))
            # Take the largest circle
            c = max(circles[0, :], key=lambda x: x[2])
            cv2.circle(mask, (c[0], c[1]), c[2], 255, -1)
            return mask

        # Fallback: largest contour as ellipse
        edges = cv2.Canny(gray_blur, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            cnt = max(contours, key=cv2.contourArea)
            if len(cnt) >= 5:
                ellipse = cv2.fitEllipse(cnt)
                cv2.ellipse(mask, ellipse, 255, -1)
                return mask

        # If nothing detected, return full mask
        return np.full((h, w), 255, dtype=np.uint8)
    
    def save_model(self, filepath='can_inspector_model.h5'):
        """Save the trained model"""
        if self.model is None:
            raise ValueError("No model to save!")
        self.model.save(filepath)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath='can_inspector_model.h5'):
        """Load a trained model"""
        self.model = keras.models.load_model(filepath)
        print(f"Model loaded from {filepath}")
        return self.model


def demo_usage():
    """
    Demo usage of the CannedFoodInspector
    """
    print("=== Canned Food Inspector Demo ===\n")
    
    # Initialize inspector
    inspector = CannedFoodInspector(img_size=(224, 224))
    
    # Build model (choose one)
    print("Building model with transfer learning...")
    inspector.build_model()  # Use transfer learning (recommended)
    # inspector.build_custom_cnn()  # Or use custom CNN
    
    print(f"Model built successfully!")
    print(f"Total parameters: {inspector.model.count_params():,}")
    inspector.model.summary()
    
    print("\n" + "="*50)
    print("To train the model:")
    print("="*50)
    print("""
# Prepare your dataset in this structure:
# data/
#   train/
#     good/       (images of good cans)
#     damaged/    (images of damaged cans - rust, dents, corrosion)
#   val/
#     good/
#     damaged/

# Train the model
# history = inspector.train(
#     train_dir='data/train',
#     val_dir='data/val',
#     epochs=50,
#     batch_size=32
# )

# Save the model
# inspector.save_model('can_inspector_model.h5')
    """)
    
    print("\n" + "="*50)
    print("To use the model for prediction:")
    print("="*50)
    print("""
# Load trained model
# inspector.load_model('can_inspector_model.h5')

# Predict single image
# result = inspector.predict('path/to/can_image.jpg')
# print(f"Result: {result['result']}")
# print(f"Confidence: {result['confidence']:.2%}")
# print(f"Damage details: {result['details']}")
    """)


if __name__ == "__main__":
    demo_usage()
