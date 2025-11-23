import PageHeading from "./PageHeading";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import apiService from '../services/apiService';
import './Home.css';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState([]);
  const [fps, setFps] = useState(5); // 5 FPS = 200ms interval
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalFrames: 0,
    detectionsCount: 0,
    lastDetectionTime: null
  });

  // Start webcam stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
      }
    } catch (err) {
      setError(`Camera access denied: ${err.message}`);
      console.error('Error accessing camera:', err);
    }
  }, []);

  // Stop webcam stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
    stopDetection();
  }, []);

  // Capture frame and convert to base64
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Send frame for detection
  const detectFrame = useCallback(async () => {
    if (!isStreamActive) return;

    try {
      const frameData = captureFrame();
      if (!frameData) return;

      // Remove data URL prefix for API
      const base64Data = frameData.split(',')[1];
      
      const result = await apiService.detectHandsFromBase64(base64Data);
      
      setDetections(result.detections || []);
      setStats(prev => ({
        ...prev,
        totalFrames: prev.totalFrames + 1,
        detectionsCount: result.detections?.length || 0,
        lastDetectionTime: result.detections?.length > 0 ? new Date() : prev.lastDetectionTime
      }));

    } catch (err) {
      console.error('Detection error:', err);
      setError(`Detection failed: ${err.message}`);
    }
  }, [isStreamActive, captureFrame]);

  // Start detection loop
  const startDetection = useCallback(() => {
    if (intervalRef.current) return; // Already running

    setIsDetecting(true);
    setError(null);
    
    const interval = 1000 / fps; // Convert FPS to milliseconds
    intervalRef.current = setInterval(detectFrame, interval);
  }, [fps, detectFrame]);

  // Stop detection loop
  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsDetecting(false);
    setDetections([]);
  }, []);

  // Draw detection boxes on canvas overlay
  const drawDetections = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    detections.forEach((detection, index) => {
      const [x1, y1, x2, y2] = detection.bbox;
      const confidence = detection.confidence;

      // Scale coordinates to canvas size
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      const scaledX1 = x1 * scaleX;
      const scaledY1 = y1 * scaleY;
      const scaledX2 = x2 * scaleX;
      const scaledY2 = y2 * scaleY;

      // Draw bounding box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY1);

      // Draw confidence label
      ctx.fillStyle = '#00ff00';
      ctx.font = '14px Arial';
      ctx.fillText(
        `Hand ${index + 1}: ${(confidence * 100).toFixed(1)}%`,
        scaledX1,
        scaledY1 - 5
      );
    });
  }, [detections]);

  // Draw detections when they update
  useEffect(() => {
    drawDetections();
  }, [detections, drawDetections]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="hand-detection-camera">
      <PageHeading />
      <div className="camera-container">
        <div className="video-wrapper">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
          />
          <canvas
            ref={canvasRef}
            className="detection-overlay"
          />
        </div>
        
        <div className="controls">
          <div className="camera-controls">
            {!isStreamActive ? (
              <button onClick={startCamera} className="btn btn-primary">
                Start Camera
              </button>
            ) : (
              <button onClick={stopCamera} className="btn btn-secondary">
                Stop Camera
              </button>
            )}
          </div>

          {isStreamActive && (
            <div className="detection-controls">
              {!isDetecting ? (
                <button onClick={startDetection} className="btn btn-success">
                  Start Detection
                </button>
              ) : (
                <button onClick={stopDetection} className="btn btn-warning">
                  Stop Detection
                </button>
              )}
            </div>
          )}

          <div className="fps-control">
            <label htmlFor="fps-slider">FPS: {fps}</label>
            <input
              id="fps-slider"
              type="range"
              min="1"
              max="10"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value))}
              disabled={isDetecting}
            />
          </div>
        </div>

        <div className="info-panel">
          <div className="detection-stats">
            <h4>Detection Stats</h4>
            <p>Total Frames: {stats.totalFrames}</p>
            <p>Current Hands: {stats.detectionsCount}</p>
            <p>FPS: {fps} ({1000/fps}ms interval)</p>
            {stats.lastDetectionTime && (
              <p>Last Detection: {stats.lastDetectionTime.toLocaleTimeString()}</p>
            )}
          </div>

          {detections.length > 0 && (
            <div className="current-detections">
              <h4>Current Detections</h4>
              {detections.map((detection, index) => (
                <div key={index} className="detection-item">
                  <strong>Hand {index + 1}</strong>
                  <br />
                  Confidence: {(detection.confidence * 100).toFixed(1)}%
                  <br />
                  BBox: [{detection.bbox.map(coord => coord.toFixed(0)).join(', ')}]
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="error-message">
              <h4>Error</h4>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
