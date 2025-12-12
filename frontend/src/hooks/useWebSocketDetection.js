import { useEffect, useRef, useState, useCallback } from 'react';
import { authService } from '../services/authService';

const WS_URL = 'ws://127.0.0.1:8000/api/detection/ws';

export const useWebSocketDetection = () => {
    const wsRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // Callback handlers
    const onMessageCallbackRef = useRef(null);

    const connect = useCallback(() => {
        try {
            const token = authService.getToken();
            if (!token) {
                setError('No authentication token found');
                return;
            }

            // Create WebSocket connection
            wsRef.current = new WebSocket(WS_URL);

            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.error) {
                        console.error('WebSocket error from server:', data.error);
                        setError(data.error);
                    } else if (onMessageCallbackRef.current) {
                        onMessageCallbackRef.current(data);
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            wsRef.current.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('WebSocket connection error');
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);

                // Attempt to reconnect
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
                    
                    console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                } else {
                    setError('Maximum reconnection attempts reached');
                }
            };

        } catch (err) {
            console.error('Failed to create WebSocket connection:', err);
            setError('Failed to create WebSocket connection');
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsConnected(false);
        reconnectAttempts.current = 0;
    }, []);

    const sendFrame = useCallback((base64Image) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket is not connected');
            return false;
        }

        try {
            const token = authService.getToken();
            const message = JSON.stringify({
                image: base64Image,
                token: token
            });

            wsRef.current.send(message);
            return true;
        } catch (err) {
            console.error('Failed to send frame:', err);
            setError('Failed to send frame');
            return false;
        }
    }, []);

    const setOnMessage = useCallback((callback) => {
        onMessageCallbackRef.current = callback;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        connect,
        disconnect,
        sendFrame,
        setOnMessage,
        isConnected,
        error
    };
};
