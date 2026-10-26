import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useGroupChat } from '../src/hooks/useGroupChat';
import type { ChatMessage } from '../src/types';

const mockHandlers: Record<string, (...args: any[]) => void> = {};
const mockSocket = {
  connected: true,
  on: jest.fn((event, handler) => {
    mockHandlers[event] = handler;
  }),
  timeout: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(),
};
jest.mock('socket.io-client', () => ({ io: () => mockSocket }));
let chat: ReturnType<typeof useGroupChat>;
let renderer: Renderer.ReactTestRenderer;
const message: ChatMessage = {
  id: '1',
  type: 'chat',
  senderId: 'bob',
  name: 'Bob',
  text: 'Hello',
  createdAt: '2026-10-15T00:00:00Z',
};

function Harness() {
  chat = useGroupChat('Tung', 'http://localhost:3000');
  return null;
}
beforeEach(async () => {
  jest.clearAllMocks();
  mockSocket.connected = true;
  mockSocket.timeout.mockReturnValue(mockSocket);
  mockSocket.connect.mockReturnValue(mockSocket);
  mockSocket.disconnect.mockReturnValue(mockSocket);
  mockSocket.emit.mockImplementation((event, payload, callback) => {
    if (event === 'user:join') {
      callback(null, { ok: true, messages: [message], userCount: 2 });
    }
    if (event === 'message:send') {
      callback(null, {
        ok: true,
        message: { ...message, id: '2', text: payload.text },
      });
    }
  });
  await act(() => {
    renderer = Renderer.create(<Harness />);
  });
});
afterEach(async () => {
  await act(() => renderer.unmount());
});

test('joins after connecting, deduplicates broadcast/ack, and restores history on reconnect', async () => {
  await act(() => mockHandlers.connect());
  expect(chat.status).toBe('connected');
  expect(chat.userCount).toBe(2);
  await act(() => mockHandlers['message:new'](message));
  expect(chat.messages).toHaveLength(1);
  await act(async () => {
    expect(await chat.sendMessage('New message')).toBe(true);
  });
  await act(() =>
    mockHandlers['message:new']({ ...message, id: '2', text: 'New message' }),
  );
  expect(chat.messages).toHaveLength(2);
  await act(() => mockHandlers.disconnect());
  expect(chat.status).toBe('offline');
  await act(() => mockHandlers.connect());
  expect(chat.messages).toEqual([message]);
  expect(chat.status).toBe('connected');
});

test('prevents offline sends and keeps failed delivery out of message history', async () => {
  await act(async () => {
    expect(await chat.sendMessage('Offline')).toBe(false);
  });
  expect(mockSocket.emit).not.toHaveBeenCalled();
  await act(() => mockHandlers.connect());
  mockSocket.emit.mockImplementation((event, payload, callback) =>
    callback(new Error('timeout')),
  );
  await act(async () => {
    expect(await chat.sendMessage('Unconfirmed')).toBe(false);
  });
  expect(chat.error).toContain('could not be confirmed');
  expect(chat.messages).toEqual([message]);
});

test('removes listeners and disconnects when leaving the screen', async () => {
  await act(() => renderer.unmount());
  expect(mockSocket.removeAllListeners).toHaveBeenCalledTimes(1);
  expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
});
