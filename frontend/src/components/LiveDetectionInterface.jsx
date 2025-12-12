import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import apiService from '../services/apiService';
import { useWebSocketDetection } from '../hooks/useWebSocketDetection';
import './LiveDetectionInterface.css';

const CAPTURE_INTERVAL = 50; // Send frames every 50ms (20 FPS with WebSocket)

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
                {log.length > 5 && <span className="log-more">...Và {log.length - 5} từ khác.</span>}
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
    const [detectionLog, setDetectionLog] = useState([]);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [detections, setDetections] = useState([]);
    const [useWebSocket, setUseWebSocket] = useState(true); // Toggle between WS and HTTP
    const isSending = useRef(false);

    // WebSocket hook
    const { 
        connect: connectWS, 
        disconnect: disconnectWS, 
        sendFrame, 
        setOnMessage, 
        isConnected: wsConnected,
        error: wsError 
    } = useWebSocketDetection();

    // Handle WebSocket messages
    useEffect(() => {
        setOnMessage((data) => {
            if (data.success) {
                const { prediction, confidence, detections: apiDetections } = data;

                // Update detections for bounding box drawing
                setDetections(apiDetections || []);

                if (confidence && confidence > 0.7 && prediction && prediction !== detectionLog[0]?.word) {
                    setDetectionLog(prevLog => [{ word: prediction, confidence }, ...prevLog]);
                }

                setTranslatedText(prediction || "Can't Detect");
                setConfidence(confidence || 0);
            } else if (data.error) {
                console.error('Detection error:', data.error);
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
            const base64Data = imageSrc.split(',')[1];
            
            if (useWebSocket && wsConnected) {
                // WebSocket: Send frames continuously without blocking
                // Backend will process them as fast as it can
                sendFrame(base64Data);
            } else {
                // HTTP: Wait for each response before sending next frame
                isSending.current = true;
                
                const data = await apiService.request('/detection/predict', {
                    method: 'POST',
                    body: JSON.stringify({ image: base64Data }),
                });

                const { prediction, confidence, detections: apiDetections } = data;

                setDetections(apiDetections || []);

                if (confidence && confidence > 0.7 && prediction && prediction !== detectionLog[0]?.word) {
                    setDetectionLog(prevLog => [{ word: prediction, confidence }, ...prevLog]);
                }

                setTranslatedText(prediction || "Can't Detect");
                setConfidence(confidence || 0);
                
                isSending.current = false;
            }
            
        } catch (error) {
            console.error('Detection error:', error);
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
        } else {
            setTranslatedText("Detection Stopped");
        }
        setIsDetecting(prev => !prev);
    };

    const handleCameraToggle = () => {
        if (isCameraOn) {
            // Stop camera and detection
            setIsDetecting(false);
            setIsCameraOn(false);
            setDetections([]);
            setTranslatedText("Camera Off");
            
            // Disconnect WebSocket
            if (wsConnected) {
                disconnectWS();
            }
        } else {
            setIsCameraOn(true);
            setTranslatedText("Camera On - Ready to detect");
        }
    };

    // Draw bounding boxes on canvas overlay
    const drawDetections = useCallback(() => {
        if (!canvasRef.current || !webcamRef.current || !isCameraOn) return;

        const canvas = canvasRef.current;
        const video = webcamRef.current.video;
        
        if (!video) return;

        const ctx = canvas.getContext('2d');
        
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
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

            // Draw confidence label background
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            const text = `Hand ${index + 1}: ${(confidence * 100).toFixed(1)}%`;
            ctx.font = '16px Arial';
            const textMetrics = ctx.measureText(text);
            ctx.fillRect(x1, y1 - 25, textMetrics.width + 10, 25);

            // Draw confidence label text
            ctx.fillStyle = '#000';
            ctx.fillText(text, x1 + 5, y1 - 8);
        });
    }, [detections, isCameraOn]);

    // Draw detections when they update
    useEffect(() => {
        if (isDetecting && isCameraOn) {
            drawDetections();
        }
    }, [detections, drawDetections, isDetecting, isCameraOn]);

    // Hàm Save (Tải xuống file TXT)
    const handleSave = () => {
        if (!detectionLog.length) return;
        const logText = detectionLog.map(item => `${item.word} (${Math.round(item.confidence * 100)}%)`).join('\n');
        
        const element = document.createElement("a");
        const file = new Blob([logText], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "asl_detection_log.txt";
        document.body.appendChild(element); 
        element.click();
        
        alert(`Đã lưu ${detectionLog.length} từ vào file "asl_detection_log.txt"`);
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
                            <canvas
                                ref={canvasRef}
                                className="detection-overlay"
                            />
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
                   
                
                    
                    <hr style={{ width: '100%', border: '1px solid var(--bg-dark)', margin: '1rem 0' }} />

                    <div className="current-result">
                        <h3>Detecting:</h3>
                        <p className="detected-text">
                            {translatedText}
                        </p>
                        <p className="confidence-text" style={{ color: confidence > 0.7 ? 'green' : 'red' }}>
                            Confidence: {Math.round(confidence * 100)}%
                        </p>
                    </div>

                    <hr style={{ width: '100%', border: '1px solid var(--bg-dark)', margin: '1rem 0' }} />

                    {/* BOX HIỆN CHỮ ĐÃ DETECT */}
                    <DetectionLog log={detectionLog} />
                    <div className="control-buttons">
                        <button 
                            className={`btn-control ${isCameraOn ? 'camera-on' : 'camera-off'}`}
                            onClick={handleCameraToggle}
                            style={{ backgroundColor: isCameraOn ? '#dc3545' : '#007bff', color: 'white' }}
                        >
                            {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                        </button>
                        
                        {isCameraOn && (
                            <button 
                                className={`btn-control ${isDetecting ? 'stop' : 'start'}`}
                                onClick={handleStartStop}
                                style={{ backgroundColor: isDetecting ? '#ffc107' : '#28a745', color: 'white' }}
                            >
                                {isDetecting ? 'Stop Detection' : 'Start Detection'}
                            </button>
                        )}
                        
                        <button 
                            className="btn-control save"
                            onClick={handleSave}
                            disabled={!detectionLog.length || isDetecting}
                            style={{ backgroundColor: '#6c757d', color: 'white' }}
                        >
                            Save Log
                        </button>
                    </div>

                    {/* Connection Status */}
                    <div className="connection-status">
                        <div className="status-row">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={useWebSocket}
                                    onChange={(e) => setUseWebSocket(e.target.checked)}
                                    disabled={isDetecting}
                                />
                                <span style={{ marginLeft: '8px' }}>Use WebSocket (Lower Latency)</span>
                            </label>
                        </div>
                        {useWebSocket && (
                            <div className="ws-status">
                                Status: <span style={{ 
                                    color: wsConnected ? 'green' : 'red',
                                    fontWeight: 'bold'
                                }}>
                                    {wsConnected ? '● Connected' : '○ Disconnected'}
                                </span>
                            </div>
                        )}
                        {wsError && (
                            <div className="ws-error">
                                Error: {wsError}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveDetectionInterface;