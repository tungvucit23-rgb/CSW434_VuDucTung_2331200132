import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CLIENT_ID } from '../config';
import type { ChatMessage, JoinReply, SendReply } from '../types';

export function useGroupChat(name: string, serverUrl: string) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>(
    'connecting',
  );
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState('');

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(current =>
      current.some(item => item.id === message.id)
        ? current
        : [...current, message].slice(-100),
    );
  }, []);

  useEffect(() => {
    let active = true;
    const socket = io(serverUrl, { autoConnect: false, timeout: 8000 });
    socketRef.current = socket;
    setStatus('connecting');
    setMessages([]);
    setError('');

    socket.on('connect', () => {
      setStatus('connecting');
      socket
        .timeout(8000)
        .emit(
          'user:join',
          { name, clientId: CLIENT_ID },
          (timeoutError: Error | null, reply: JoinReply) => {
            if (!active || !socket.connected) {
              return;
            }
            if (timeoutError || !reply?.ok) {
              setStatus('offline');
              setError(
                !timeoutError && reply && !reply.ok
                  ? reply.error
                  : 'Joining timed out. Please try again.',
              );
              return;
            }
            setMessages(reply.messages);
            setUserCount(reply.userCount);
            setStatus('connected');
            setError('');
          },
        );
    });
    socket.on('message:new', addMessage);
    socket.on('users:count', setUserCount);
    socket.on('disconnect', () => {
      setStatus('offline');
      setUserCount(0);
      setError('Connection lost. Reconnecting automatically…');
    });
    socket.on('connect_error', () => {
      setStatus('offline');
      setError(
        'Cannot reach the server. Check the server address and your connection.',
      );
    });
    socket.connect();
    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [name, serverUrl, addMessage]);

  function sendMessage(text: string): Promise<boolean> {
    const socket = socketRef.current;
    if (!socket?.connected || status !== 'connected') {
      setError('Wait until you are connected before sending.');
      return Promise.resolve(false);
    }
    return new Promise(resolve => {
      socket
        .timeout(8000)
        .emit(
          'message:send',
          { text },
          (timeoutError: Error | null, reply: SendReply) => {
            if (timeoutError || !reply?.ok) {
              setError(
                !timeoutError && reply && !reply.ok
                  ? reply.error
                  : 'Delivery could not be confirmed. Check the chat before trying again.',
              );
              resolve(false);
              return;
            }
            addMessage(reply.message);
            setError('');
            resolve(true);
          },
        );
    });
  }

  function reconnect() {
    setStatus('connecting');
    setError('');
    socketRef.current?.disconnect().connect();
  }

  return {
    messages,
    status,
    userCount,
    error,
    sendMessage,
    reconnect,
    clientId: CLIENT_ID,
  };
}
