import { useEffect,useRef,useState } from "react";


export function useWebSocket(url:string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected,setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    return () => socket.close();

  },[url])

  const send = (data:string) => {
    if(socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(data);
    }
  };

  return {socketRef,connected,send};

}