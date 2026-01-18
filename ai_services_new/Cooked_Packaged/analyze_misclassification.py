"""
Visualize which parts of the image the model focused on using Grad-CAM
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import tensorflow as tf
import numpy as np
import cv2
from PIL import Image
import matplotlib.pyplot as plt
from model import CookedDetectionModel

def get_grad_cam(model, img_array, layer_name):
    """Generate Grad-CAM heatmap"""
    # Create a model that outputs both predictions and layer activations
    grad_model = tf.keras.models.Model(
        [model.inputs],
        [model.get_layer(layer_name).output, model.output]
    )
    
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        loss = predictions[:, 0]
    
    output = conv_outputs[0]
    grads = tape.gradient(loss, conv_outputs)[0]
    
    gate_f = tf.cast(output > 0, tf.float32)
    weighted_grads = grads * gate_f
    
    weights = tf.reduce_mean(weighted_grads, axis=(0, 1))
    
    cam = tf.reduce_sum(weights[tf.newaxis, tf.newaxis, :] * tf.cast(output, tf.float32), axis=-1)
    
    cam = np.maximum(cam, 0)
    cam = cam / (cam.max() + 1e-8)
    
    return cam.numpy()

# Load image and model
image_path = r"C:\Users\Loor Ibrahim\Downloads\WhatsApp Image 2026-01-14 at 6.23.14 PM.jpeg"
img = Image.open(image_path).resize((224, 224))
img_array = np.array(img) / 255.0
img_array = np.expand_dims(img_array, axis=0)

# Load detector
detector = CookedDetectionModel()
detector.load_trained_model("cooked_detection_model.h5")
model = detector.model

# Get prediction
prediction = model.predict(img_array, verbose=0)
confidence = prediction[0][0]

# Get Grad-CAM for the last conv layer
layer_name = None
for layer in reversed(model.layers):
    if 'conv' in layer.name.lower():
        layer_name = layer.name
        break

if layer_name:
    print(f"Using layer: {layer_name}")
    cam = get_grad_cam(model, img_array, layer_name)
else:
    print("Could not find convolutional layer")
    cam = None

# Visualize
fig, axes = plt.subplots(1, 3, figsize=(15, 5))

# Original image
original_img = Image.open(image_path).resize((224, 224))
axes[0].imshow(original_img)
axes[0].set_title('Original Image')
axes[0].axis('off')

# Heatmap
if cam is not None:
    axes[1].imshow(cam, cmap='hot')
    axes[1].set_title(f'Model Focus Areas (Grad-CAM)\n{confidence:.2%} Cooked')
    axes[1].axis('off')
    
    # Overlay
    img_uint8 = np.array(original_img)
    cam_resized = cv2.resize(cam, (224, 224))
    cam_heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
    cam_heatmap = cv2.cvtColor(cam_heatmap, cv2.COLOR_BGR2RGB)
    
    overlay = cv2.addWeighted(img_uint8, 0.6, cam_heatmap, 0.4, 0)
    axes[2].imshow(overlay)
    axes[2].set_title('Overlay: What the model saw')
    axes[2].axis('off')

plt.tight_layout()
plt.show()

print(f"\nModel Prediction: {confidence:.4f}")
print(f"Interpretation: {confidence:.2%} confidence it's COOKED")
print(f"\nThis is a FALSE POSITIVE - the food is actually NOT cooked")
print(f"The model may be confused by:")
print(f"  - Color patterns similar to cooked food")
print(f"  - Texture that resembles cooked surfaces")
print(f"  - Lighting or presentation that mimics cooked food appearance")
