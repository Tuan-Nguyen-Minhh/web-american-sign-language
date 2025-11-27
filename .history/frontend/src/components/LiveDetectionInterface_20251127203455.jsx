import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

const API_URL = 'http://127.0.0.1:8000/predict'; 
const CAPTURE_INTERVAL = 300; // Tần suất quét frame (300ms)

// --- Component phụ hiển thị lịch sử từ đã nhận diện ---
const DetectionLog = ({ log }) => (
    <div className="detection-log">
        <h3>📜 Lịch sử từ đã nhận diện:</h3>
        {log.length > 0 ? (
            <div className="log-box">
                {log.map((item, index) => (
                    <span key={index} className="log-item">
                        {item.word} ({Math.round(item.confidence * 100)}%)
                    </span>
                ))}
            </div>
        ) : (
            <p className="log-empty">Chưa có từ nào được ghi nhận.</p>
        )}
    </div>
);

// --- Component Chính ---
const LiveDetectionInterface = () => {
    const webcamRef = useRef(null); 
    const [translatedText, setTranslatedText] = useState("Sẵn sàng...");
    const [confidence, setConfidence] = useState(0);
    const [detectionLog, setDetectionLog] = useState([]);
    const [isDetecting, setIsDetecting] = useState(false); // TRẠNG THÁI START/STOP
    const isSending = useRef(false);

    // Xử lý gửi frame
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

            if (!response.ok) throw new Error('API thất bại');
            
            // GIẢ SỬ BACKEND TRẢ VỀ { prediction: "TỪ", confidence: 0.95 }
            const data = await response.json(); 
            const { prediction, confidence } = data;

            if (confidence && confidence > 0.7 && prediction && prediction !== detectionLog[0]?.word) {
                // Thêm vào lịch sử nếu độ tin cậy cao và không bị lặp từ
                setDetectionLog(prevLog => [{ word: prediction, confidence }, ...prevLog]);
            }

            setTranslatedText(prediction || "Không nhận diện được");
            setConfidence(confidence || 0);
            
        } catch (error) {
            setTranslatedText(`Lỗi: ${error.message}`);
        } finally {
            isSending.current = false;
        }
    }, [isDetecting, detectionLog]); // Phụ thuộc vào isDetecting và detectionLog

    // 1. Logic Start/Stop: Chỉ chạy interval khi isDetecting = true
    useEffect(() => {
        let intervalId;
        if (isDetecting) {
            intervalId = setInterval(captureAndSend, CAPTURE_INTERVAL);
        }
        return () => clearInterval(intervalId); // Tắt interval khi isDetecting là false
    }, [isDetecting, captureAndSend]);

    // Hàm điều khiển
    const handleStartStop = () => {
        if (!isDetecting) {
            setTranslatedText("BẮT ĐẦU NHẬN DIỆN...");
            setDetectionLog([]); // Xóa log cũ khi bắt đầu
        } else {
            setTranslatedText("DỪNG NHẬN DIỆN");
        }
        setIsDetecting(prev => !prev);
    };

    const handleSave = () => {
        // Tải xuống file text hoặc gửi log lên server (Tùy chọn)
        alert(`Đã lưu ${detectionLog.length} từ đã nhận diện.`);
    };

    return (
        <div className="webcam-container">
            <div className="webcam-layout">

                {/* CỘT 1: CAMERA (2/3) */}
                <div className="webcam-column">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user" }}
                    />
                </div>

                {/* CỘT 2: RESULT PANEL (1/3) */}
                <div className="results-column">
                    
                    {/* KHỐI NÚT ĐIỀU KHIỂN */}
                    <div className="control-buttons">
                        <button 
                            className={`btn-control ${isDetecting ? 'stop' : 'start'}`}
                            onClick={handleStartStop}
                            style={{ backgroundColor: isDetecting ? 'red' : 'green', color: 'white' }}
                        >
                            {isDetecting ? '🛑 STOP' : '▶️ START'}
                        </button>
                        <button 
                            className="btn-control save"
                            onClick={handleSave}
                            disabled={!detectionLog.length}
                            style={{ backgroundColor: 'var(--bg-darker)', color: '#333' }}
                        >
                            💾 LƯU PHIÊN ({detectionLog.length})
                        </button>
                    </div>
                    
                    <hr style={{ width: '100%', border: '1px solid var(--bg-dark)', margin: '1rem 0' }} />

                    {/* KHỐI KẾT QUẢ HIỆN TẠI */}
                    <div className="current-result">
                        <h3>Đang nhận diện:</h3>
                        <p className="detected-text">
                            {translatedText}
                        </p>
                        <p className="confidence-text" style={{ color: confidence > 0.7 ? 'green' : 'red' }}>
                            Độ tin cậy: **{Math.round(confidence * 100)}%**
                        </p>
                    </div>

                    <hr style={{ width: '100%', border: '1px solid var(--bg-dark)', margin: '1rem 0' }} />

                    {/* BOX LỊCH SỬ ĐÃ DETECT */}
                    <DetectionLog log={detectionLog} />
                </div>
            </div>
        </div>
    );
};

export default LiveDetectionInterface;