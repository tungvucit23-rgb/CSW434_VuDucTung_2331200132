export type RootStackParamList = {
  Home: undefined;
  Group: { name: string; serverUrl: string };
};

export type ChatMessage = {
  id: string;
  type: 'chat' | 'system';
  text: string;
  createdAt: string;
  senderId?: string;
  name?: string;
};

export type JoinReply =
  | { ok: true; messages: ChatMessage[]; userCount: number }
  | { ok: false; error: string };

export type SendReply =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };
