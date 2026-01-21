"""
ASL Character Prediction using MediaPipe + SVM
This script uses MediaPipe to extract hand keypoints and a trained SVM model to predict ASL letters.
"""

import cv2
import numpy as np
import joblib
import mediapipe as mp
import argparse
import os

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# Paths (update these to match your environment)
MODEL_PATH = r"d:\Workspaces\PROJECT\asl-character-detection\model\svm\svm_asl_model.joblib"


def normalize_keypoints(keypoints):
    """
    Normalize keypoints relative to wrist (index 0) and scale by max distance.
    This matches the normalization used in asl_svm_dataset.py
    
    Args:
        keypoints: numpy array of shape (21, 2) containing x, y coordinates
        
    Returns:
        Normalized coordinates as flat array
    """
    wrist = keypoints[0].copy()
    coords = keypoints - wrist
    dists = np.linalg.norm(coords, axis=1)
    scale = dists.max()
    if scale < 1e-6:
        scale = 1.0
    coords = coords / scale
    return coords


def extract_hand_keypoints_mediapipe(image_rgb, hands_detector):
    """
    Extract hand keypoints using MediaPipe.
    
    Args:
        image_rgb: Image in RGB format
        hands_detector: MediaPipe Hands detector instance
        
    Returns:
        numpy array of shape (21, 2) with normalized keypoints, or None if no hand detected
    """
    results = hands_detector.process(image_rgb)
    
    if results.multi_hand_landmarks:
        # Get the first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]
        
        # Extract x, y coordinates (ignore z)
        h, w = image_rgb.shape[:2]
        keypoints = []
        for landmark in hand_landmarks.landmark:
            x = landmark.x * w
            y = landmark.y * h
            keypoints.append([x, y])
        
        return np.array(keypoints, dtype=np.float32)
    
    return None


def predict_from_image(image_path, model, hands_detector, visualize=True):
    """
    Predict ASL letter from an image file.
    
    Args:
        image_path: Path to image file
        model: Loaded SVM model (sklearn pipeline)
        hands_detector: MediaPipe Hands detector instance
        visualize: Whether to display the image with prediction
        
    Returns:
        Predicted letter or None if no hand detected
    """
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"[ERROR] Cannot read image: {image_path}")
        return None
    
    # Convert BGR to RGB for MediaPipe
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Extract keypoints
    keypoints = extract_hand_keypoints_mediapipe(img_rgb, hands_detector)
    
    if keypoints is None:
        print(f"[WARN] No hand detected in: {image_path}")
        return None
    
    # Normalize keypoints (same as training preprocessing)
    kp_norm = normalize_keypoints(keypoints)
    feat = kp_norm.reshape(-1)  # Flatten to 1D array
    
    # Predict
    prediction = model.predict([feat])[0]
    
    # Get probability scores if available
    if hasattr(model, 'predict_proba'):
        probabilities = model.predict_proba([feat])[0]
        max_prob = probabilities.max()
        print(f"[INFO] Predicted: {prediction} (confidence: {max_prob:.2%})")
    else:
        print(f"[INFO] Predicted: {prediction}")
    
    # Visualize
    if visualize:
        # Draw hand landmarks
        results = hands_detector.process(img_rgb)
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    img, hand_landmarks, mp_hands.HAND_CONNECTIONS)
        
        # Add prediction text
        cv2.putText(img, f"Prediction: {prediction}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Display
        cv2.imshow("ASL Prediction", img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    
    return prediction


def predict_from_webcam(model, hands_detector):
    """
    Real-time ASL letter prediction from webcam.
    
    Args:
        model: Loaded SVM model (sklearn pipeline)
        hands_detector: MediaPipe Hands detector instance
    """
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("[ERROR] Cannot open webcam")
        return
    
    print("[INFO] Press 'q' to quit")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Cannot read frame from webcam")
            break
        
        # Flip frame horizontally for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Extract keypoints
        keypoints = extract_hand_keypoints_mediapipe(img_rgb, hands_detector)
        
        if keypoints is not None:
            # Normalize and predict
            kp_norm = normalize_keypoints(keypoints)
            feat = kp_norm.reshape(-1)
            prediction = model.predict([feat])[0]
            
            # Draw hand landmarks
            results = hands_detector.process(img_rgb)
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    mp_drawing.draw_landmarks(
                        frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            # Display prediction
            cv2.putText(frame, f"Letter: {prediction}", (10, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
        else:
            cv2.putText(frame, "No hand detected", (10, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        
        # Display frame
        cv2.imshow("ASL Character Detection", frame)
        
        # Check for 'q' key
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="ASL Character Prediction using MediaPipe + SVM")
    parser.add_argument("--mode", type=str, choices=["image", "webcam"], default="webcam",
                        help="Prediction mode: 'image' or 'webcam'")
    parser.add_argument("--image", type=str, help="Path to image file (required if mode=image)")
    parser.add_argument("--model", type=str, default=MODEL_PATH,
                        help="Path to trained SVM model (.joblib)")
    
    args = parser.parse_args()
    
    # Load SVM model
    if not os.path.exists(args.model):
        print(f"[ERROR] Model file not found: {args.model}")
        print(f"[INFO] Please train the model first using svm_train.py")
        return
    
    print(f"[INFO] Loading SVM model from: {args.model}")
    model = joblib.load(args.model)
    print(f"[INFO] Model loaded successfully")
    
    # Initialize MediaPipe Hands
    hands_detector = mp_hands.Hands(
        static_image_mode=(args.mode == "image"),
        max_num_hands=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    try:
        if args.mode == "image":
            if not args.image:
                print("[ERROR] --image argument is required for image mode")
                parser.print_help()
                return
            
            if not os.path.exists(args.image):
                print(f"[ERROR] Image file not found: {args.image}")
                return
            
            predict_from_image(args.image, model, hands_detector, visualize=True)
        
        elif args.mode == "webcam":
            predict_from_webcam(model, hands_detector)
    
    finally:
        hands_detector.close()


if __name__ == "__main__":
    main()
