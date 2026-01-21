import React, { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import apiService from "../services/apiService";
import { authService } from "../services/authService";
import { yoloModel } from "../utils/onnxModelLoader";
import { useWebSocketDetection } from "../hooks/useWebSocketDetection";
import API_BASE_URL from "../config/api";
import GuestRestriction from "./guest/GuestRestriction";
import "./LiveDetectionInterface.css";

const CAPTURE_INTERVAL = 100; // Run inference every 100ms (10 FPS for local processing)
const USE_WEBSOCKET = true; // Toggle between WebSocket and HTTP

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto close after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{type === "success" ? "✓" : "✕"}</div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
      </div>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

const DetectionLog = ({ log }) => (
  <div className="detection-log">
    <h3>History:</h3>
    {log.length > 0 ? (
      <div className="log-box">
        {/* Hiển thị 5 từ gần nhất */}
        {log.slice(0, 5).map((item, index) => (
          <span key={index} className="log-item">
            {item.word} ({Math.round(item.confidence * 100)}%)
          </span>
        ))}
        {log.length > 5 && (
          <span className="log-more">...Và {log.length - 5} từ khác.</span>
        )}
      </div>
    ) : (
      <p className="log-empty">Nothing.</p>
    )}
  </div>
);

// --- Component Chính: LiveDetectionInterface ---
const LiveDetectionInterface = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [translatedText, setTranslatedText] = useState("Ready");
  const [confidence, setConfidence] = useState(0);
  const [lastDetectedText, setLastDetectedText] = useState(""); // Store last valid detection
  const [lastDetectedConfidence, setLastDetectedConfidence] = useState(0);
  const [accumulatedText, setAccumulatedText] = useState(""); // Accumulated letters
  const lastPredictionRef = useRef(""); // Track last prediction to avoid duplicates
  const currentPredictionRef = useRef(""); // Track current stable prediction
  const predictionStartTimeRef = useRef(null); // Track when current prediction started
  const holdDuration = 1500; // seconds hold time in milliseconds
  const [detectionLog, setDetectionLog] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Helper function to process special commands
  const processDetection = useCallback((prediction) => {
    const lowerPred = prediction.toLowerCase();
    
    if (lowerPred === 'space') {
      setAccumulatedText(prev => prev + ' ');
    } else if (lowerPred === 'del') {
      setAccumulatedText(prev => prev.slice(0, -1));
    } else if (lowerPred === 'nothing') {
      // Do nothing - don't add to accumulated text
    } else {
      // Regular letter - add it
      setAccumulatedText(prev => prev + prediction);
    }
  }, []);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [detections, setDetections] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [toast, setToast] = useState(null); // Toast notification state
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const isSending = useRef(false);

  // WebSocket hook for real-time detection
  const {
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    sendFrame,
    setOnMessage,
    isConnected: wsConnected,
    error: wsError
  } = useWebSocketDetection();

  // Toast notification helper
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Text-to-Speech function using free Browser Web Speech API
  const speakText = useCallback(
    (text, confidenceValue) => {
      // Check if browser supports speech synthesis
      if (!("speechSynthesis" in window)) {
        showToast("Your browser does not support text-to-speech", "error");
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Skip if text is empty or error message
      if (
        !text ||
        text.includes("Error") ||
        text === "Can't Detect" ||
        text === "No gesture detected" ||
        text === "Ready" ||
        text === "Camera Off"
      ) {
        return;
      }

      // Use text directly without confidence information
      let speechText = text;

      // Create speech utterance
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = 1.0; // Speed (0.1 to 10)
      utterance.pitch = 1.0; // Pitch (0 to 2)
      utterance.volume = 1.0; // Volume (0 to 1)
      utterance.lang = "en-US"; // Language

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      // Speak the text
      window.speechSynthesis.speak(utterance);
    },
    [showToast]
  );

  // Helper function to speak button actions
  const speakButtonAction = useCallback((actionText) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(actionText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }, []);

  // WebSocket message handler
  useEffect(() => {
    if (USE_WEBSOCKET) {
      setOnMessage((data) => {
        if (data.status === 'success' && data.prediction) {
          const letterPrediction = data.prediction;
          const letterConfidence = data.confidence;
          
          console.log(`✅ WebSocket Predicted: ${letterPrediction} (${(letterConfidence * 100).toFixed(1)}%)`);
          
          // Update current detection display
          setTranslatedText(letterPrediction);
          setConfidence(letterConfidence);
          
          // Store last valid detection
          setLastDetectedText(letterPrediction);
          setLastDetectedConfidence(letterConfidence);
          
          // Handle letter confirmation with 2-second hold time
          if (letterConfidence > 0.7) {
            const now = Date.now();
            
            // Check if this is the same prediction as before
            if (letterPrediction === currentPredictionRef.current) {
              // Same prediction - check if held long enough
              const holdTime = now - predictionStartTimeRef.current;
              
              if (holdTime >= holdDuration) {
                // Check if this letter was already added
                if (letterPrediction !== lastPredictionRef.current) {
                  // Held for 2 seconds and not already added - confirm it!
                  console.log(`🎯 Confirmed letter: ${letterPrediction} (held for ${(holdTime/1000).toFixed(1)}s)`);
                  processDetection(letterPrediction);
                  lastPredictionRef.current = letterPrediction;
                  
                  // Update detection log
                  setDetectionLog((prevLog) => [
                    { word: letterPrediction, confidence: letterConfidence },
                    ...prevLog,
                  ]);
                }
              }
            } else {
              // Different prediction - reset timer and allow same letter again
              console.log(`⏱️ New prediction: ${letterPrediction}, starting timer...`);
              currentPredictionRef.current = letterPrediction;
              predictionStartTimeRef.current = now;
              // Reset last prediction to allow duplicates
              if (letterPrediction !== lastPredictionRef.current) {
                lastPredictionRef.current = "";
              }
            }
          } else {
            // Low confidence - reset tracking to allow duplicates
            currentPredictionRef.current = "";
            predictionStartTimeRef.current = null;
            lastPredictionRef.current = ""; // Allow same letter after break
          }
        } else if (data.status === 'no_hand_detected') {
          // Don't update text, keep showing last detection
          console.log('⚠️ WebSocket: No hand detected');
        } else if (data.status === 'error') {
          console.error('❌ WebSocket error:', data.error);
        }
      });
    }
  }, [setOnMessage, detectionLog]);

  // WebSocket connection management
  useEffect(() => {
    if (USE_WEBSOCKET && isDetecting && !wsConnected) {
      console.log('🔌 Connecting WebSocket...');
      connectWebSocket();
    } else if (!isDetecting && wsConnected) {
      console.log('🔌 Disconnecting WebSocket...');
      disconnectWebSocket();
    }
  }, [isDetecting, wsConnected, connectWebSocket, disconnectWebSocket]);

  // WebSocket error handling
  useEffect(() => {
    if (wsError) {
      showToast(`WebSocket error: ${wsError}`, 'error');
    }
  }, [wsError, showToast]);

  // Load ONNX model on component mount
  useEffect(() => {
    const initModel = async () => {
      setModelLoading(true);
      showToast("Loading AI model...", "success");
      
      try {
        const success = await yoloModel.loadModel();
        
        if (success) {
          setModelLoaded(true);
          showToast("AI model loaded successfully!", "success");
        } else {
          setModelLoaded(false);
          showToast("Failed to load AI model. Check console for details.", "error");
        }
      } catch (error) {
        setModelLoaded(false);
        showToast(`Model loading error: ${error.message}`, "error");
      } finally {
        setModelLoading(false);
      }
    };
    
    initModel();
    
    // Cleanup on unmount
    return () => {
      yoloModel.unload();
    };
  }, []); // Run only once on mount

  // Process frame locally using ONNX model
  const captureAndDetect = useCallback(async () => {
    if (!isDetecting || !webcamRef.current || !modelLoaded) return;
    if (isSending.current) return; // Prevent concurrent processing
    
    try {
      isSending.current = true;
      
      // Get video element
      const video = webcamRef.current.video;
      if (!video || video.readyState !== 4) {
        isSending.current = false;
        return;
      }
      
      // Run local inference
      const result = await yoloModel.detect(video);
      
      if (result.success && result.detections && result.detections.length > 0) {
        const apiDetections = result.detections;
        
        console.log('Hand detections:', apiDetections);
        
        // Update detections for bounding box drawing
        setDetections(apiDetections);
        
        // Get the first detected hand
        const handDetection = apiDetections[0];
        let [x1, y1, x2, y2] = handDetection.bbox;
        
        // Expand bounding box by 20% to capture full hand
        const width = x2 - x1;
        const height = y2 - y1;
        const expandX = width * 0.2;
        const expandY = height * 0.2;
        
        x1 = Math.max(0, x1 - expandX);
        y1 = Math.max(0, y1 - expandY);
        x2 = Math.min(video.videoWidth, x2 + expandX);
        y2 = Math.min(video.videoHeight, y2 + expandY);
        
        // Update bounding box for display
        apiDetections[0].bbox = [x1, y1, x2, y2];
        setDetections(apiDetections);
        
        // Create canvas with full frame
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        // Send to backend via WebSocket or HTTP
        if (USE_WEBSOCKET && wsConnected) {
          // WebSocket mode - send base64 image
          const base64Image = canvas.toDataURL('image/jpeg', 0.95);
          const success = sendFrame(base64Image);
          
          if (!success) {
            console.warn('⚠️ Failed to send frame via WebSocket');
          }
        } else {
          // HTTP mode - existing implementation
          console.log(`📸 Sending full frame via HTTP: ${canvas.width}x${canvas.height}`);
          
          canvas.toBlob(async (blob) => {
            try {
              const file = new File([blob], 'hand.jpg', { type: 'image/jpeg' });
              const formData = new FormData();
              formData.append('file', file);
              
              const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE_URL}/detection/predict-asl`, {
              method: 'POST',
              headers: token ? { 'Authorization': `Bearer ${token}` } : {},
              body: formData
            });
            
            if (!response.ok) {
              throw new Error(`Backend error: ${response.status}`);
            }
            
            const svmResult = await response.json();
            console.log('🔤 SVM prediction result:', svmResult);
            
            if (svmResult.status === 'success' && svmResult.prediction) {
              const letterPrediction = svmResult.prediction;
              const letterConfidence = svmResult.confidence;
              
              console.log(`✅ Predicted: ${letterPrediction} (${(letterConfidence * 100).toFixed(1)}%)`);
              
              // Update current detection display
              setTranslatedText(letterPrediction);
              setConfidence(letterConfidence);
              
              // Store last valid detection
              setLastDetectedText(letterPrediction);
              setLastDetectedConfidence(letterConfidence);
              
              // Handle letter confirmation with 2-second hold time
              if (letterConfidence > 0.7) {
                const now = Date.now();
                
                // Check if this is the same prediction as before
                if (letterPrediction === currentPredictionRef.current) {
                  // Same prediction - check if held long enough
                  const holdTime = now - predictionStartTimeRef.current;
                  
                  if (holdTime >= holdDuration) {
                    // Check if this letter was already added
                    if (letterPrediction !== lastPredictionRef.current) {
                      // Held for 2 seconds and not already added - confirm it!
                      console.log(`🎯 Confirmed letter: ${letterPrediction} (held for ${(holdTime/1000).toFixed(1)}s)`);
                      processDetection(letterPrediction);
                      lastPredictionRef.current = letterPrediction;
                      
                      // Update detection log
                      setDetectionLog((prevLog) => [
                        { word: letterPrediction, confidence: letterConfidence },
                        ...prevLog,
                      ]);
                    }
                  }
                } else {
                  // Different prediction - reset timer and allow same letter again
                  console.log(`⏱️ New prediction: ${letterPrediction}, starting timer...`);
                  currentPredictionRef.current = letterPrediction;
                  predictionStartTimeRef.current = now;
                  // Reset last prediction to allow duplicates
                  if (letterPrediction !== lastPredictionRef.current) {
                    lastPredictionRef.current = "";
                  }
                }
              } else {
                // Low confidence - reset tracking to allow duplicates
                currentPredictionRef.current = "";
                predictionStartTimeRef.current = null;
                lastPredictionRef.current = ""; // Allow same letter after break
              }
            } else if (svmResult.status === 'no_hand_detected') {
              console.log('⚠️ Backend: No hand landmarks found');
              setTranslatedText("No hand detected");
              setConfidence(0);
            } else {
              console.log('⚠️ Unknown response:', svmResult);
              setTranslatedText("Can't Detect");
              setConfidence(0);
            }
          } catch (error) {
            console.error('❌ SVM prediction error:', error);
            setTranslatedText("Error: " + error.message);
            setConfidence(0);
          }
        }, 'image/jpeg', 0.95);
        }
      } else {
        console.log('No hands detected');
        setDetections([]);
        setTranslatedText("No gesture detected");
        setConfidence(0);
      }
      
    } catch (error) {
      setTranslatedText(`Error: ${error.message}`);
    } finally {
      isSending.current = false;
    }
  }, [isDetecting, detectionLog, modelLoaded, wsConnected, sendFrame]);

  // Run detection at regular intervals
  useEffect(() => {
    let intervalId;
    if (isDetecting && modelLoaded) {
      intervalId = setInterval(captureAndDetect, CAPTURE_INTERVAL);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isDetecting, captureAndDetect, modelLoaded]);

  const handleStartStop = () => {
    if (!modelLoaded) {
      showToast("Please wait for the model to load", "error");
      return;
    }
    
    if (!isDetecting) {
      setTranslatedText("Start Detecting");
      setDetectionLog([]);
      setAccumulatedText(""); // Reset accumulated text
      lastPredictionRef.current = ""; // Reset last prediction
      currentPredictionRef.current = ""; // Reset current prediction
      predictionStartTimeRef.current = null; // Reset timer
      speakButtonAction("Starting detection");
    } else {
      setTranslatedText("Detection Stopped");
      speakButtonAction("Detection stopped");

      // Increment session counter in background (don't await)
      apiService
        .request("/detection-history/increment-session", {
          method: "POST",
        })
        .then((response) => {
          console.log("Session counter incremented:", response);
        })
        .catch((error) => {
          console.error("Failed to increment session counter:", error);
        });
    }
    setIsDetecting((prev) => !prev);
  };

  const handleCameraToggle = () => {
    if (isCameraOn) {
      // Stop camera and detection
      setIsDetecting(false);
      setIsCameraOn(false);
      setDetections([]);
      setDetectionLog([]); // Clear history when turning off camera
      setTranslatedText("Camera Off");
      setConfidence(0); // Reset confidence
      speakButtonAction("Camera turned off");
    } else {
      if (!modelLoaded && !modelLoading) {
        showToast("Model is still loading, please wait...", "error");
        return;
      }
      setIsCameraOn(true);
      setTranslatedText("Ready to detect");
      speakButtonAction("Camera turned on");
    }
  };

  // Draw bounding boxes on canvas overlay
  const drawDetections = useCallback(() => {
    if (!canvasRef.current || !webcamRef.current || !isCameraOn) {return;}

    const canvas = canvasRef.current;
    const video = webcamRef.current.video;

    if (!video) {return;}

    const ctx = canvas.getContext("2d");

    // Set canvas size to match video
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    detections.forEach((detection, index) => {
      const [x1, y1, x2, y2] = detection.bbox;
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Draw predicted letter (use translatedText and confidence from state)
      const displayText = translatedText !== "Ready" && 
                         translatedText !== "Can't Detect" && 
                         translatedText !== "Camera Off" &&
                         translatedText !== "No gesture detected"
        ? `${translatedText} (${(confidence * 100).toFixed(1)}%)`
        : `Detecting...`;

      // Draw label background
      ctx.fillStyle = "rgba(0, 255, 0, 0.9)";
      ctx.font = "bold 20px Arial";
      const textMetrics = ctx.measureText(displayText);
      ctx.fillRect(x1, y1 - 30, textMetrics.width + 16, 30);

      // Draw label text
      ctx.fillStyle = "#000";
      ctx.fillText(displayText, x1 + 8, y1 - 8);
    });
  }, [detections, isCameraOn, translatedText, confidence]);

  // Draw detections when they update
  useEffect(() => {
    console.log('🎨 Draw effect triggered:', {
      isDetecting,
      isCameraOn,
      detectionsCount: detections.length,
      detections
    });
    
    if (isDetecting && isCameraOn && detections.length > 0) {
      drawDetections();
    } else {
      console.log('Skipping draw - conditions not met');
    }
  }, [detections, drawDetections, isDetecting, isCameraOn]);

  // Save detection session to database
  const handleSave = async () => {
    if (!detectionLog.length) return;

    // Check if user is a guest
    if (authService.isGuest()) {
      setShowGuestModal(true);
      return;
    }

    try {
      // Save to database
      const sessionName = `Detection Session ${new Date().toLocaleString()}`;
      await apiService.request("/detection-history/save", {
        method: "POST",
        body: JSON.stringify({
          session_name: sessionName,
          detections: detectionLog,
        }),
      });

      speakButtonAction(`Saved ${detectionLog.length} detections to database`);
      showToast(
        `Successfully saved ${detectionLog.length} detections to your profile!`,
        "success"
      );
    } catch (error) {
      console.error("Failed to save detection history:", error);
      showToast(`Failed to save: ${error.message}`, "error");
    }
  };

  return (
    <div className="webcam-container">
      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <div className="webcam-layout">
        {/* CỘT TRÁI: CAMERA (2/3) */}
        <div className="webcam-column">
          {isCameraOn ? (
            <div className="video-container">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="webcam-video"
              />
              <canvas ref={canvasRef} className="detection-overlay" />
            </div>
          ) : (
            <div className="camera-off">
              <h3>Camera is Off</h3>
              <p>Click "Turn On Camera" to start</p>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: RESULT PANEL (1/3) */}
        <div className="results-column">
          {/* KHỐI NÚT ĐIỀU KHIỂN */}

          <hr
            style={{
              width: "100%",
              border: "1px solid var(--bg-dark)",
              margin: "1rem 0",
            }}
          />

          <div className="current-result">
            <h3>Text:</h3>
            <p className="detected-text" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {accumulatedText || "Ready to detect..."}
            </p>
          </div>

          <hr
            style={{
              width: "100%",
              border: "1px solid var(--bg-dark)",
              margin: "1rem 0",
            }}
          />

          {/* BOX HIỆN CHỮ ĐÃ DETECT */}
          <DetectionLog log={detectionLog} />
          <div className="control-buttons">
            <button
              className={`btn-control ${
                isCameraOn ? "camera-on" : "camera-off"
              }`}
              onClick={handleCameraToggle}
              style={{
                backgroundColor: isCameraOn ? "#ca4654ff" : "#68acf5ff",
                color: "white",
              }}
            >
              {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
            </button>

            {isCameraOn && (
              <button
                className={`btn-control ${isDetecting ? "stop" : "start"}`}
                onClick={handleStartStop}
                style={{
                  backgroundColor: isDetecting ? "#edc755ff" : "#4cd16bff",
                  color: "white",
                }}
              >
                {isDetecting ? "Stop Detection" : "Start Detection"}
              </button>
            )}

            <div className="button-row">
              <button
                className="btn-control speak"
                onClick={() =>
                  speakText(
                    accumulatedText || lastDetectedText || translatedText,
                    lastDetectedConfidence || confidence
                  )
                }
                disabled={isDetecting || isSpeaking || !accumulatedText}
                style={{
                  backgroundColor: isSpeaking ? "#17a2b8" : "#7d53cbff",
                  color: "white",
                  opacity:
                    isDetecting || isSpeaking || !accumulatedText ? 0.5 : 1,
                }}
              >
                {isSpeaking ? "🔊 Speaking..." : "🔊 Speak"}
              </button>

              <button
                className="btn-control clear"
                onClick={() => {
                  setAccumulatedText("");
                  lastPredictionRef.current = "";
                  speakButtonAction("Text cleared");
                }}
                disabled={!accumulatedText || isDetecting}
                style={{
                  backgroundColor: "#ff6b6b",
                  color: "white",
                  opacity: !accumulatedText || isDetecting ? 0.5 : 1,
                }}
              >
                Clear
              </button>

              <button
                className="btn-control save"
                onClick={handleSave}
                disabled={!detectionLog.length || isDetecting}
                style={{ backgroundColor: "#6c757d", color: "white" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Restriction Modal */}
      {showGuestModal && (
        <div
          className="guest-modal-overlay"
          onClick={() => setShowGuestModal(false)}
        >
          <div
            className="guest-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="guest-modal-icon">🔒</div>
            <h2>Authentication Required</h2>
            <p>
              You need to <strong>login</strong> or <strong>register</strong> to
              save detection history.
            </p>
            <p className="guest-modal-note">
              Guest users can use detection features, but cannot save their
              progress.
            </p>
            <div className="guest-modal-actions">
              <button
                className="btn-modal-login"
                onClick={() => {
                  authService.logout();
                }}
              >
                Login / Register
              </button>
              <button
                className="btn-modal-cancel"
                onClick={() => setShowGuestModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDetectionInterface;
