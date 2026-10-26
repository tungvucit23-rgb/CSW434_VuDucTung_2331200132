import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useGroupChat } from '../hooks/useGroupChat';
import type { ChatMessage, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Group'>;

export default function GroupScreen({ route, navigation }: Props) {
  const { name, serverUrl } = route.params;
  const chat = useGroupChat(name, serverUrl);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList<ChatMessage>>(null);
  const sendingRef = useRef(false);
  const canSend = chat.status === 'connected' && !!draft.trim() && !sending;

  async function send() {
    if (!canSend || sendingRef.current) {
      return;
    }
    sendingRef.current = true;
    setSending(true);
    const text = draft;
    try {
      if (await chat.sendMessage(text)) {
        setDraft(current => (current === text ? '' : current));
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    if (item.type === 'system') {
      return <Text style={styles.system}>{item.text}</Text>;
    }
    const own = item.senderId === chat.clientId;
    return (
      <View style={[styles.messageRow, own && styles.ownRow]}>
        {!own ? (
          <View style={styles.avatar}>
            <Text style={styles.initial}>
              {item.name?.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        ) : null}
        <View style={styles.messageContent}>
          {!own ? <Text style={styles.sender}>{item.name}</Text> : null}
          <View style={[styles.bubble, own && styles.ownBubble]}>
            <Text
              selectable
              style={[styles.messageText, own && styles.ownText]}
            >
              {item.text}
            </Text>
          </View>
          <Text style={[styles.time, own && styles.ownTime]}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave group"
            onPress={() => navigation.goBack()}
            style={styles.back}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.title}>Group CSW 434</Text>
            <Text style={styles.subtitle}>
              {chat.status === 'connected'
                ? `${chat.userCount} online · ${name}`
                : chat.status === 'connecting'
                ? 'Connecting…'
                : 'Offline'}
            </Text>
          </View>
          <View
            style={[
              styles.dot,
              chat.status === 'connected' && styles.onlineDot,
            ]}
          />
        </View>
        {chat.error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.error}>
              {chat.error}
            </Text>
            {chat.status === 'offline' ? (
              <Pressable
                accessibilityRole="button"
                onPress={chat.reconnect}
                style={styles.retry}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <FlatList
          ref={list}
          data={chat.messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel="Group messages"
          onContentSizeChange={() =>
            list.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Welcome to the group</Text>
              <Text style={styles.emptyText}>
                Say hello and start the conversation.
              </Text>
            </View>
          }
        />
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message"
            testID="message-input"
            style={styles.messageInput}
            placeholder="Write a message…"
            placeholderTextColor="#8a9993"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            testID="send-message"
            onPress={send}
            disabled={!canSend}
            style={[styles.send, !canSend && styles.disabled]}
          >
            <Text style={styles.sendText}>{sending ? '…' : '➤'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ef',
  },
  back: {
    width: 56,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 38, color: '#23443a', lineHeight: 42 },
  title: { fontSize: 17, fontWeight: '600', color: '#172e29' },
  subtitle: { fontSize: 12, color: '#809087', marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#c3cbc7' },
  onlineDot: { backgroundColor: '#20a391' },
  messages: { padding: 20, flexGrow: 1 },
  system: {
    fontSize: 12,
    color: '#8b9992',
    textAlign: 'center',
    marginVertical: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  ownRow: { justifyContent: 'flex-end' },
  messageContent: { maxWidth: '80%', flexShrink: 1 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e3f1e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  initial: { color: '#217c70', fontWeight: '700' },
  sender: {
    color: '#243d34',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  bubble: {
    backgroundColor: '#f0f5f5',
    borderRadius: 14,
    borderTopLeftRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  ownBubble: {
    backgroundColor: '#219e90',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 3,
  },
  messageText: { fontSize: 15, lineHeight: 22, color: '#243d34' },
  ownText: { color: '#fff' },
  time: { fontSize: 10, color: '#8b9992', marginTop: 5 },
  ownTime: { textAlign: 'right' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { color: '#217c70', fontSize: 18, fontWeight: '600' },
  emptyText: { color: '#8b9992', marginTop: 10, textAlign: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2ef',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f0f5f5',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 46,
    maxHeight: 120,
    color: '#243d34',
    fontSize: 15,
  },
  send: {
    backgroundColor: '#219e90',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendText: { color: '#fff', fontSize: 23 },
  disabled: { opacity: 0.35 },
  errorBox: {
    backgroundColor: '#fff5e7',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  error: { flex: 1, color: '#8a5c22', fontSize: 12, lineHeight: 18 },
  retry: { padding: 10 },
  retryText: { color: '#217c70', fontWeight: '600' },
});
