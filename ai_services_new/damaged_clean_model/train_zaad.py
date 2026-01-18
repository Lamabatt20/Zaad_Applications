"""
Train model on Zaad dataset
"""

from model import CannedFoodInspector
import matplotlib.pyplot as plt
import os


def train_on_zaad_dataset():
    """
    Train the model on the Zaad canned food dataset
    """
    print("\n" + "="*70)
    print("🥫 TRAINING ON ZAAD DATASET")
    print("="*70 + "\n")
    
    # Dataset path
    dataset_path = r"C:\Users\Loor Ibrahim\Desktop\Zaad\Zaad_Applications\ai-services\damage_detection\dataset"
    
    train_dir = os.path.join(dataset_path, "train")
    val_dir = os.path.join(dataset_path, "val")
    
    # Verify dataset exists
    if not os.path.exists(train_dir):
        print(f"❌ Error: Dataset not found at {dataset_path}")
        return False
    
    # Count images
    train_good = len([f for f in os.listdir(os.path.join(train_dir, "good")) if f.endswith(('.jpg', '.png', '.jpeg'))])
    train_damaged = len([f for f in os.listdir(os.path.join(train_dir, "damaged")) if f.endswith(('.jpg', '.png', '.jpeg'))])
    
    if os.path.exists(val_dir):
        val_good = len([f for f in os.listdir(os.path.join(val_dir, "good")) if f.endswith(('.jpg', '.png', '.jpeg'))])
        val_damaged = len([f for f in os.listdir(os.path.join(val_dir, "damaged")) if f.endswith(('.jpg', '.png', '.jpeg'))])
    else:
        val_good = val_damaged = 0
    
    print(f"📊 Dataset Summary:")
    print(f"   Training - Good: {train_good}, Damaged: {train_damaged}")
    print(f"   Validation - Good: {val_good}, Damaged: {val_damaged}")
    print(f"   Total: {train_good + train_damaged + val_good + val_damaged} images\n")
    
    # Initialize and build model
    print("📦 Building model with transfer learning...")
    inspector = CannedFoodInspector(img_size=(224, 224))
    inspector.build_model()
    
    inspector.model.build((None, 224, 224, 3))
    params = inspector.model.count_params()
    print(f"✅ Model built - {params:,} parameters\n")
    
    # Training configuration
    epochs = 100
    batch_size = 16
    
    print(f"🚀 Starting training:")
    print(f"   Epochs: {epochs}")
    print(f"   Batch size: {batch_size}")
    print(f"   Train dir: {train_dir}")
    print(f"   Val dir: {val_dir}\n")
    
    # Train
    try:
        history = inspector.train(
            train_dir=train_dir,
            val_dir=val_dir if os.path.exists(val_dir) else None,
            epochs=epochs,
            batch_size=batch_size
        )
        
        # Save model
        model_file = 'can_inspector_zaad_model.h5'
        inspector.save_model(model_file)
        
        print(f"\n✅ Training completed successfully!")
        print(f"💾 Model saved to: {model_file}")
        
        # Plot history
        plot_training_history(history)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during training: {str(e)}")
        return False


def plot_training_history(history):
    """Plot training metrics"""
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    # Accuracy
    axes[0, 0].plot(history.history['accuracy'], label='Training', linewidth=2)
    if 'val_accuracy' in history.history:
        axes[0, 0].plot(history.history['val_accuracy'], label='Validation', linewidth=2)
    axes[0, 0].set_title('Accuracy', fontsize=12, fontweight='bold')
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Accuracy')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    
    # Loss
    axes[0, 1].plot(history.history['loss'], label='Training', linewidth=2)
    if 'val_loss' in history.history:
        axes[0, 1].plot(history.history['val_loss'], label='Validation', linewidth=2)
    axes[0, 1].set_title('Loss', fontsize=12, fontweight='bold')
    axes[0, 1].set_xlabel('Epoch')
    axes[0, 1].set_ylabel('Loss')
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)
    
    # Precision
    if 'precision' in history.history:
        axes[1, 0].plot(history.history['precision'], label='Training', linewidth=2)
        if 'val_precision' in history.history:
            axes[1, 0].plot(history.history['val_precision'], label='Validation', linewidth=2)
        axes[1, 0].set_title('Precision', fontsize=12, fontweight='bold')
        axes[1, 0].set_xlabel('Epoch')
        axes[1, 0].set_ylabel('Precision')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)
    
    # Recall
    if 'recall' in history.history:
        axes[1, 1].plot(history.history['recall'], label='Training', linewidth=2)
        if 'val_recall' in history.history:
            axes[1, 1].plot(history.history['val_recall'], label='Validation', linewidth=2)
        axes[1, 1].set_title('Recall', fontsize=12, fontweight='bold')
        axes[1, 1].set_xlabel('Epoch')
        axes[1, 1].set_ylabel('Recall')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('zaad_training_history.png', dpi=300, bbox_inches='tight')
    print(f"📊 Training plots saved to: zaad_training_history.png")
    plt.show()


if __name__ == "__main__":
    success = train_on_zaad_dataset()
    
    if success:
        print("\n" + "="*70)
        print("🎉 Training Complete!")
        print("="*70)
        print("\n✅ Next steps:")
        print("   1. Test the model:")
        print('      python main.py --image "path/to/can.jpg" --model can_inspector_zaad_model.h5')
        print("   2. Batch inspect:")
        print('      python main.py --folder "path/to/images/" --model can_inspector_zaad_model.h5')
        print("   3. Real-time webcam:")
        print('      python main.py --webcam --model can_inspector_zaad_model.h5')
