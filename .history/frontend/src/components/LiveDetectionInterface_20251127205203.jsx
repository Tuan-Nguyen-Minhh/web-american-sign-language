import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

const API_URL = 'http://127.0.0.1:8000/predict'; 
const CAPTURE_INTERVAL = 300; // Gửi frame mỗi 300ms

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
    const [translatedText, setTranslatedText] = useState("Ready");
    const [confidence, setConfidence] = useState(0);
    const [detectionLog, setDetectionLog] = useState([]);
    const [isDetecting, setIsDetecting] = useState(false); // TRẠNG THÁI START/STOP
    const isSending = useRef(false);

    // Hàm xử lý chụp và gửi frame
    const captureAndSend = useCallback(async () => {
        if (!isDetecting || isSending.current || !webcamRef.current) return;
        
        const imageSrc = webcamRef.current.getScreenshot(); 
        if (!imageSrc) return; 

        try {
            isSending.current = true;
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageSrc }),
            });

            if (!response.ok) throw new Error('Fail API');
            
            const data = await response.json(); 
            const { prediction, confidence } = data; // Giả định Backend trả về prediction và confidence

            if (confidence && confidence > 0.7 && prediction && prediction !== detectionLog[0]?.word) {
                setDetectionLog(prevLog => [{ word: prediction, confidence }, ...prevLog]);
            }

            setTranslatedText(prediction || "Can't Detect");
            setConfidence(confidence || 0);
            
        } catch (error) {
            setTranslatedText(`Error	: ${error.message}`);
        } finally {
            isSending.current = false;
        }
    }, [isDetecting, detectionLog]);

    useEffect(() => {
        let intervalId;
        if (isDetecting) {
            intervalId = setInterval(captureAndSend, CAPTURE_INTERVAL);
        }
        return () => clearInterval(intervalId); // Dọn dẹp
    }, [isDetecting, captureAndSend]);

    const handleStartStop = () => {
        if (!isDetecting) {
            setTranslatedText("Start Detecting");
            setDetectionLog([]); // Xóa log cũ
        } else {
            setTranslatedText("Detection Stopped");
        }
        setIsDetecting(prev => !prev);
    };

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
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user" }}
                    />
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
                            className={`btn-control ${isDetecting ? 'stop' : 'start'}`}
                            onClick={handleStartStop}
                            style={{ backgroundColor: isDetecting ? 'red' : 'green', color: 'white' }}
                        >
                            {isDetecting ? 'STOP' : 'START'}
                        </button>
                        <button 
                            className="btn-control save"
                            onClick={handleSave}
                            disabled={!detectionLog.length || isDetecting}
                            style={{ backgroundColor: 'var(--bg-darker)', color: '#333' }}
                        >
                            Save 
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveDetectionInterface;