import { useState, useEffect, useRef } from 'react';
import { WebSocketMessage, WebSocketState } from '@/types';
import { useWalletStore } from '@/store/walletStore';

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
  });
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const { user } = useWalletStore();
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!user) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    // Store socket globally for other components to use
    (window as any).chatSocket = socket;
    
    socket.onopen = () => {
      console.log('WebSocket connected');
      setState({ connected: true });
      
      // Send connect message with user ID
      socket.send(JSON.stringify({
        type: 'connect',
        payload: { userId: user.id }
      }));
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
      setState({ connected: false });
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setState({
        connected: false,
        error: 'WebSocket connection error'
      });
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        console.log('Received WebSocket message:', message);
        
        // Store the message in state
        setMessages((prev) => [...prev, message]);
        
        // Handle connected message to set socket ID
        if (message.type === 'connected' && message.payload.socketId) {
          setState((prev) => ({
            ...prev,
            socketId: message.payload.socketId
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      (window as any).chatSocket = null;
    };
  }, [user]);
  
  // Send a message over WebSocket
  const sendMessage = (message: WebSocketMessage) => {
    const socket = socketRef.current;
    
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }
    
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  };
  
  return {
    connected: state.connected,
    socketId: state.socketId,
    error: state.error,
    messages,
    sendMessage,
  };
}
