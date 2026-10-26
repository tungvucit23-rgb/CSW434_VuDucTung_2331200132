import { Platform } from 'react-native';

export const DEFAULT_SERVER_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const PROFILE_KEY = '@lab1/profile';
// Keep the same identity when the socket reconnects.
export const CLIENT_ID = `client_${Date.now()}_${Math.random()
  .toString(36)
  .slice(2)}`;

export function normalizeServerUrl(value: string): string | null {
  try {
    const url = new URL(value.trim().replace(/\/+$/, ''));
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
