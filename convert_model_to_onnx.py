"""
Script to convert YOLOv8 model to ONNX format for web deployment
Run this script to convert your best.pt model to ONNX format that can be used in the browser
"""

from ultralytics import YOLO
from pathlib import Path

def convert_yolo_to_onnx(model_path: str, output_path: str = None):
    """
    Convert YOLOv8 model to ONNX format
    
    Args:
        model_path: Path to the .pt model file (e.g., 'best.pt' or 'yolov8.pt')
        output_path: Optional output path for ONNX model
    """
    try:
        # Load the YOLO model
        print(f"Loading model from: {model_path}")
        model = YOLO(model_path)
        
        # If no output path specified, use same directory as input
        if output_path is None:
            model_file = Path(model_path)
            output_path = str(model_file.parent / f"{model_file.stem}.onnx")
        
        # Export to ONNX format
        # imgsz=640 is standard for YOLOv8, adjust if needed
        # dynamic=True allows variable input sizes
        # simplify=True optimizes the model for inference
        print(f"Converting to ONNX format...")
        model.export(
            format='onnx',
            imgsz=640,
            dynamic=True,
            simplify=True,
            opset=12  # ONNX opset version compatible with ONNX Runtime Web
        )
        
        print(f"✅ Model successfully converted to ONNX!")
        print(f"📁 ONNX model saved at: {output_path}")
        print(f"\nNext steps:")
        print(f"1. Copy the .onnx file to: frontend/public/models/")
        print(f"2. Install onnxruntime-web in frontend")
        print(f"3. Update LiveDetectionInterface.jsx to use local inference")
        
        return output_path
        
    except Exception as e:
        print(f"❌ Error converting model: {e}")
        return None

if __name__ == "__main__":
    # Convert the current model
    # Replace 'backend/detection/yolov8.pt' with your 'best.pt' path
    model_path = "backend/detection/best.pt"
    
    # You can also specify your best.pt if you have it
    # model_path = "path/to/your/best.pt"
    
    if Path(model_path).exists():
        convert_yolo_to_onnx(model_path)
    else:
        print(f"❌ Model file not found: {model_path}")
        print("Please update the model_path variable with the correct path to your model")
