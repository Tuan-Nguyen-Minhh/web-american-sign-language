import React, { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import apiService from "../services/apiService";
import { authService } from "../services/authService";
import { useWebSocketDetection } from "../hooks/useWebSocketDetection";
import GuestRestriction from "./guest/GuestRestriction";
import "./LiveDetectionInterface.css";

const CAPTURE_INTERVAL = 25; // Send frames every 50ms (20 FPS with WebSocket)

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
  const [detectionLog, setDetectionLog] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [detections, setDetections] = useState([]);
  const [useWebSocket, setUseWebSocket] = useState(true); // Toggle between WS and HTTP
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const isSending = useRef(false);

  // WebSocket hook
  const {
    connect: connectWS,
    disconnect: disconnectWS,
    sendFrame,
    setOnMessage,
    isConnected: wsConnected,
    error: wsError,
  } = useWebSocketDetection();

  // Text-to-Speech function using free Browser Web Speech API
  const speakText = useCallback((text, confidenceValue) => {
    // Check if browser supports speech synthesis
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support text-to-speech");
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

    // Build comprehensive speech text with all information
    let speechText = text;

    // Add confidence information if available
    if (confidenceValue && confidenceValue > 0) {
      const confidencePercent = Math.round(confidenceValue * 100);
      speechText += ` with ${confidencePercent} percent confidence`;
    }

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
  }, []);

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

  // Handle WebSocket messages
  useEffect(() => {
    setOnMessage((data) => {
      if (data.success) {
        const { prediction, confidence, detections: apiDetections } = data;

        // Update detections for bounding box drawing
        setDetections(apiDetections || []);

        if (
          confidence &&
          confidence > 0.7 &&
          prediction &&
          prediction !== detectionLog[0]?.word
        ) {
          setDetectionLog((prevLog) => [
            { word: prediction, confidence },
            ...prevLog,
          ]);
        }

        setTranslatedText(prediction || "Can't Detect");
        setConfidence(confidence || 0);

        // Store last valid detection for speaking after stopping
        if (
          prediction &&
          confidence > 0 &&
          prediction !== "No gesture detected" &&
          prediction !== "Can't Detect"
        ) {
          setLastDetectedText(prediction);
          setLastDetectedConfidence(confidence);
        }
      } else if (data.error) {
        console.error("Detection error:", data.error);
        setTranslatedText(`Error: ${data.error}`);
      }

      isSending.current = false;
    });
  }, [setOnMessage, detectionLog]);

  // Hàm xử lý chụp và gửi frame
  const captureAndSend = useCallback(async () => {
    if (!isDetecting || !webcamRef.current) return;

    // Block only for HTTP requests, not for WebSocket
    if (!useWebSocket && isSending.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      // Remove data URL prefix for API (data:image/jpeg;base64,...)
      const base64Data = imageSrc.split(",")[1];

      if (useWebSocket && wsConnected) {
        // WebSocket: Send frames continuously without blocking
        // Backend will process them as fast as it can
        sendFrame(base64Data);
      } else {
        // HTTP: Wait for each response before sending next frame
        isSending.current = true;

        const data = await apiService.request("/detection/predict", {
          method: "POST",
          body: JSON.stringify({ image: base64Data }),
        });

        const { prediction, confidence, detections: apiDetections } = data;

        setDetections(apiDetections || []);

        if (
          confidence &&
          confidence > 0.7 &&
          prediction &&
          prediction !== detectionLog[0]?.word
        ) {
          setDetectionLog((prevLog) => [
            { word: prediction, confidence },
            ...prevLog,
          ]);
        }

        setTranslatedText(prediction || "Can't Detect");
        setConfidence(confidence || 0);

        // Store last valid detection for speaking after stopping
        if (
          prediction &&
          confidence > 0 &&
          prediction !== "No gesture detected" &&
          prediction !== "Can't Detect"
        ) {
          setLastDetectedText(prediction);
          setLastDetectedConfidence(confidence);
        }

        isSending.current = false;
      }
    } catch (error) {
      console.error("Detection error:", error);
      setTranslatedText(`Error: ${error.message}`);
      setConfidence(0);
      isSending.current = false;
    }
  }, [isDetecting, detectionLog, useWebSocket, wsConnected, sendFrame]);

  useEffect(() => {
    let intervalId;
    if (isDetecting) {
      intervalId = setInterval(captureAndSend, CAPTURE_INTERVAL);
    }
    return () => clearInterval(intervalId); // Dọn dẹp
  }, [isDetecting, captureAndSend]);

  const handleStartStop = () => {
    if (!isDetecting) {
      // Connect WebSocket when starting detection
      if (useWebSocket && !wsConnected) {
        connectWS();
      }
      setTranslatedText("Start Detecting");
      setDetectionLog([]);
      speakButtonAction("Starting detection");
    } else {
      // Update UI immediately (non-blocking)
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

      // Disconnect WebSocket
      if (wsConnected) {
        disconnectWS();
      }
    } else {
      setIsCameraOn(true);
      setTranslatedText("Ready to detect");
      speakButtonAction("Camera turned on");
    }
  };

  // Draw bounding boxes on canvas overlay
  const drawDetections = useCallback(() => {
    if (!canvasRef.current || !webcamRef.current || !isCameraOn) return;

    const canvas = canvasRef.current;
    const video = webcamRef.current.video;

    if (!video) return;

    const ctx = canvas.getContext("2d");

    // Set canvas size to match video
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    detections.forEach((detection, index) => {
      const [x1, y1, x2, y2] = detection.bbox;
      const confidence = detection.confidence;

      // Draw bounding box
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Draw confidence label background
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      const text = `Hand ${index + 1}: ${(confidence * 100).toFixed(1)}%`;
      ctx.font = "16px Arial";
      const textMetrics = ctx.measureText(text);
      ctx.fillRect(x1, y1 - 25, textMetrics.width + 10, 25);

      // Draw confidence label text
      ctx.fillStyle = "#000";
      ctx.fillText(text, x1 + 5, y1 - 8);
    });
  }, [detections, isCameraOn]);

  // Draw detections when they update
  useEffect(() => {
    if (isDetecting && isCameraOn) {
      drawDetections();
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
      alert(
        `Successfully saved ${detectionLog.length} detections to your profile!`
      );
    } catch (error) {
      console.error("Failed to save detection history:", error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  return (
    <div className="webcam-container">
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
            <h3>Detecting:</h3>
            <p className="detected-text">{translatedText}</p>
            <p
              className="confidence-text"
              style={{ color: confidence > 0.7 ? "green" : "red" }}
            >
              Confidence: {Math.round(confidence * 100)}%
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
                    lastDetectedText || translatedText,
                    lastDetectedConfidence || confidence
                  )
                }
                disabled={isDetecting || isSpeaking || !lastDetectedText}
                style={{
                  backgroundColor: isSpeaking ? "#17a2b8" : "#7d53cbff",
                  color: "white",
                  opacity:
                    isDetecting || isSpeaking || !lastDetectedText ? 0.5 : 1,
                }}
              >
                {isSpeaking ? "🔊 Speaking..." : "🔊 Speak"}
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
        <div className="guest-modal-overlay" onClick={() => setShowGuestModal(false)}>
          <div className="guest-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="guest-modal-icon">🔒</div>
            <h2>Authentication Required</h2>
            <p>
              You need to <strong>login</strong> or <strong>register</strong> to save detection history.
            </p>
            <p className="guest-modal-note">
              Guest users can use detection features, but cannot save their progress.
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
