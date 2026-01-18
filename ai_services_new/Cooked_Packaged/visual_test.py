import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import warnings
warnings.filterwarnings('ignore')

from model import CookedDetectionModel
import matplotlib.pyplot as plt
import cv2
import sys

def show_prediction(image_path):
    """Display prediction result with image"""
    detector = CookedDetectionModel()
    detector.load_trained_model('cooked_detection_model.h5')
    
    # Make prediction
    result = detector.predict(image_path)
    
    # Load and display image
    img = cv2.imread(image_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Create figure
    fig = plt.figure(figsize=(10, 8))
    
    # Display image
    plt.imshow(img)
    plt.axis('off')
    
    # Add result text at the top
    result_text = f"Result: {result['label']} (Confidence: {result['confidence']:.1%})"
    
    # Choose color based on result
    color = 'green' if result['label'] == 'COOKED' else 'blue'
    
    plt.title(result_text, fontsize=24, fontweight='bold', color=color, pad=20)
    
    plt.tight_layout()
    plt.show()
    
    print(f"\n{result_text}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        # Default test image
        image_path = r'C:\Users\Loor Ibrahim\Downloads\WhatsApp Image 2026-01-14 at 3.41.42 PM.jpeg'
    
    show_prediction(image_path)
