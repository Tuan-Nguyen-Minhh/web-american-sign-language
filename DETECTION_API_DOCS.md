# ASL Detection API - Backend Integration

## Overview

The backend now uses **MediaPipe** to extract hand landmarks from camera frames and feeds them to the **SVM model** to predict ASL letters.

## Pipeline Flow

```
Camera Frame → MediaPipe (Extract Landmarks) → SVM Model → Predicted Letter
```

### Details:
1. **MediaPipe** processes the frame and extracts 21 hand landmarks (x, y coordinates)
2. **Feature Extraction**: Converts 21 landmarks into 42 features (21 × 2 = 42)
3. **SVM Model** predicts the ASL letter from these features
4. Returns prediction with confidence score and processed image with landmarks drawn

## API Endpoint

### `POST /api/detection/predict-asl`

**Description**: Detects hand landmarks using MediaPipe and predicts ASL letter using SVM model

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field containing the image

**Response**:
```json
{
  "status": "success",
  "prediction": "A",
  "confidence": 0.85,
  "message": "Detected ASL letter: A",
  "processed_image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
}
```

**When no hand is detected**:
```json
{
  "status": "no_hand_detected",
  "prediction": null,
  "confidence": 0.0,
  "message": "No hand detected in the frame",
  "processed_image": null
}
```

## Model Information

- **SVM Classes**: A-Z letters, 'del', 'nothing', 'space' (29 classes total)
- **Input Features**: 42 (21 hand landmarks × 2 coordinates: x, y)
- **Pipeline**: StandardScaler → SVC (Support Vector Classifier)

## Frontend Integration Example

```javascript
async function sendFrameForPrediction(imageBlob) {
  const formData = new FormData();
  formData.append('file', imageBlob, 'frame.jpg');
  
  const response = await fetch('/api/detection/predict-asl', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    console.log('Predicted letter:', result.prediction);
    console.log('Confidence:', result.confidence);
    // Display the processed image with landmarks
    imageElement.src = result.processed_image;
  }
}

// Capture frame from video
function captureFrame(videoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0);
  
  canvas.toBlob(blob => {
    sendFrameForPrediction(blob);
  }, 'image/jpeg', 0.8);
}
```

## Testing

Run the test script:
```bash
python test_detection_api.py
```

Or test the endpoint directly:
```bash
# Start the backend server
uvicorn backend.main:app --reload

# In another terminal, test with curl (replace with actual image)
curl -X POST "http://localhost:8000/api/detection/predict-asl" \
  -H "accept: application/json" \
  -F "file=@path/to/hand_image.jpg"
```

## Requirements

```
mediapipe==0.10.9
opencv-python>=4.0.0
numpy>=1.21.0
scikit-learn>=1.0.0
joblib>=1.0.0
```

All requirements are already installed in the virtual environment.

## Notes

- MediaPipe extracts 21 hand landmarks from the image
- The SVM model expects exactly 42 features (x, y for each of the 21 landmarks)
- Z-coordinate is not used by the model
- Detection works best with single hand in frame
- The processed image includes visualized landmarks for debugging
