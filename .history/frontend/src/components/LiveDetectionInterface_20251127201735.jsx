import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

// Giả định API endpoint và tần suất gửi frame
const API_URL = 'http://127.0.0.1:8000/api/predict'; 
const CAPTURE_INTERVAL = 300; 

const DetectionLog = ({ log }) => (
    <div className="detection-log">
        <h3>📜 Lịch sử từ đã nhận diện:</h3>
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
            <p className="log-empty" style={{textAlign: 'center', fontSize: '0.9rem'}}>Chưa có từ nào được ghi nhận.</p>
        )}
    </div>
);

// --- Component Chính ---
const LiveDetectionInterface = () => {
    const webcamRef = useRef(null); 
    const [translatedText, setTranslatedText] = useState("Sẵn sàng...");
    const [confidence, setConfidence] = useState(0);
    const [detectionLog, setDetectionLog] = useState([]);
    const [isDetecting, setIsDetecting] = useState(false);
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
            
            // Giả sử Backend trả về { prediction: "TỪ", confidence: 0.95 }
            const data = await response.json(); 
            const { prediction, confidence } = data;

            // Logic cập nhật lịch sử (Độ tin cậy > 70% và từ mới)
            if (confidence && confidence > 0.7 && prediction && prediction !== detectionLog[0]?.word) {
                setDetectionLog(prevLog => [{ word: prediction, confidence }, ...prevLog]);
            }

            setTranslatedText(prediction || "Không nhận diện được");
            setConfidence(confidence || 0);
            
        } catch (error) {
            setTranslatedText(`Lỗi: ${error.message}`);
        } finally {
            isSending.current = false;
        }
    }, [isDetecting, detectionLog]);

    // Thiết lập Interval gửi frame
    useEffect(() => {
        let intervalId;
        if (isDetecting) {
            intervalId = setInterval(captureAndSend, CAPTURE_INTERVAL);
        }
        return () => clearInterval(intervalId); 
    }, [isDetecting, captureAndSend]);

    // Hàm điều khiển Start/Stop
    const handleStartStop = () => {
        if (!isDetecting) {
            setTranslatedText("BẮT ĐẦU NHẬN DIỆN...");
            setDetectionLog([]); // Xóa log khi bắt đầu phiên mới
        } else {
            setTranslatedText("DỪNG NHẬN DIỆN");
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
                    <div className="control-buttons">
                        <button 
                            className={`btn-control ${isDetecting ? 'stop' : 'start'}`}
                            onClick={handleStartStop}
                        >
                            {isDetecting ? '🛑 STOP' : '▶️ START'}
                        </button>
                        <button 
                            className="btn-control save"
                            onClick={handleSave}
                            disabled={!detectionLog.length || isDetecting}
                        >
                            💾 LƯU PHIÊN ({detectionLog.length})
                        </button>
                    </div>
                    
                    <hr style={{ width: '100%', border: '1px solid var(--border-color)', margin: '1rem 0' }} />

                    {/* CHỮ ĐANG DETECT + CONFIDENCE */}
                    <div className="current-result">
                        <h3>Đang nhận diện:</h3>
                        <p className="detected-text">
                            {translatedText}
                        </p>
                        <p className="confidence-text">
                            Độ tin cậy: **{Math.round(confidence * 100)}%**
                        </p>
                    </div>

                    <hr style={{ width: '100%', border: '1px solid var(--border-color)', margin: '1rem 0' }} />

                    {/* BOX HIỆN CHỮ ĐÃ DETECT */}
                    <DetectionLog log={detectionLog} />
                </div>
            </div>
        </div>
    );
};

export default LiveDetectionInterface;