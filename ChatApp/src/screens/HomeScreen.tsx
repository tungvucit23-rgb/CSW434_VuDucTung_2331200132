import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DEFAULT_SERVER_URL, normalizeServerUrl, PROFILE_KEY } from '../config';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PROFILE_KEY)
      .then(saved => {
        if (!active || !saved) {
          return;
        }
        const profile = JSON.parse(saved);
        if (typeof profile.name === 'string') {
          setName(profile.name);
        }
        if (typeof profile.serverUrl === 'string') {
          setServerUrl(profile.serverUrl);
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not restore your name. Please enter it again.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function startChat() {
    if (saving) {
      return;
    }
    const cleanName = name.trim();
    const url = normalizeServerUrl(serverUrl);
    if (!cleanName || cleanName.length > 40) {
      setError('Please enter your name (1–40 characters).');
      return;
    }
    if (!url) {
      setShowSettings(true);
      setError('Enter a server address such as http://192.168.1.10:3000.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await AsyncStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ name: cleanName, serverUrl: url }),
      );
      navigation.navigate('Group', { name: cleanName, serverUrl: url });
    } catch {
      setError('Could not save your name. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>LET’S TALK</Text>
            <Text style={styles.title}>Your Name</Text>
            <Text style={styles.subtitle}>
              Please enter your name to start a new chat.
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator
              color="#217c70"
              accessibilityLabel="Loading saved name"
            />
          ) : (
            <View>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                accessibilityLabel="Your name"
                testID="name-input"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Richard Nguyen"
                placeholderTextColor="#96a19e"
                autoCapitalize="words"
                maxLength={40}
                returnKeyType="go"
                onSubmitEditing={startChat}
                editable={!saving}
              />
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                testID="start-chat"
                onPress={startChat}
                disabled={saving}
                style={[styles.button, saving && styles.disabled]}
              >
                <Text style={styles.buttonText}>
                  {saving ? 'Saving…' : 'Start Chat'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowSettings(!showSettings)}
                style={styles.settingsButton}
                accessibilityState={{ expanded: showSettings }}
              >
                <Text style={styles.settingsText}>
                  Connection settings {showSettings ? '−' : '+'}
                </Text>
              </Pressable>
              {showSettings ? (
                <View style={styles.settings}>
                  <Text style={styles.label}>Server address</Text>
                  <TextInput
                    accessibilityLabel="Server address"
                    style={styles.input}
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    editable={!saving}
                  />
                  <Text style={styles.hint}>
                    On a phone, use your computer’s local IP address. Both
                    devices must be on the same Wi-Fi.
                  </Text>
                </View>
              ) : null}
            </View>
          )}
          <Text style={styles.footer}>One group. Everyone connected.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#fff' },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 30,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  heading: { alignItems: 'center', marginBottom: 64 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
    color: '#217c70',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '600', color: '#172e29' },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7c8884',
    textAlign: 'center',
    marginTop: 18,
  },
  label: { color: '#217c70', fontSize: 13, marginBottom: 4 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#dce4e1',
    color: '#172e29',
    fontSize: 17,
    paddingVertical: 12,
  },
  button: {
    backgroundColor: '#217c70',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    letterSpacing: 2,
    fontWeight: '500',
  },
  disabled: { opacity: 0.5 },
  error: { color: '#b53939', marginTop: 12, lineHeight: 20 },
  settingsButton: { paddingVertical: 20, alignItems: 'center' },
  settingsText: { color: '#607970', fontSize: 13 },
  settings: { marginBottom: 16 },
  hint: { fontSize: 12, color: '#7c8884', lineHeight: 19, marginTop: 10 },
  footer: {
    textAlign: 'center',
    color: '#96a19e',
    fontSize: 12,
    marginTop: 48,
  },
});
