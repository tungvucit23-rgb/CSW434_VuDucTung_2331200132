import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../src/screens/HomeScreen';
import { PROFILE_KEY } from '../src/config';

const navigate = jest.fn();
let screen: Renderer.ReactTestRenderer;

beforeEach(async () => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});
afterEach(async () => {
  await act(() => screen?.unmount());
});
async function renderHome() {
  await act(async () => {
    screen = Renderer.create(
      <HomeScreen {...({ navigation: { navigate } } as any)} />,
    );
  });
}

test('rejects whitespace names without navigation', async () => {
  await renderHome();
  await act(() =>
    screen.root.findByProps({ testID: 'name-input' }).props.onChangeText('  '),
  );
  await act(() =>
    screen.root.findByProps({ testID: 'start-chat' }).props.onPress(),
  );
  expect(navigate).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('saves a trimmed name before opening the group', async () => {
  await renderHome();
  await act(() =>
    screen.root
      .findByProps({ testID: 'name-input' })
      .props.onChangeText('  Tung  '),
  );
  await act(() =>
    screen.root.findByProps({ testID: 'start-chat' }).props.onPress(),
  );
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    PROFILE_KEY,
    expect.stringContaining('"name":"Tung"'),
  );
  expect(navigate).toHaveBeenCalledWith(
    'Group',
    expect.objectContaining({ name: 'Tung' }),
  );
});

test('restores the saved name when reopened', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({ name: 'Tung', serverUrl: 'http://localhost:3000' }),
  );
  await renderHome();
  expect(screen.root.findByProps({ testID: 'name-input' }).props.value).toBe(
    'Tung',
  );
});

test('does not navigate when local storage fails', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
    new Error('storage unavailable'),
  );
  await renderHome();
  await act(() =>
    screen.root
      .findByProps({ testID: 'name-input' })
      .props.onChangeText('Tung'),
  );
  await act(() =>
    screen.root.findByProps({ testID: 'start-chat' }).props.onPress(),
  );
  expect(navigate).not.toHaveBeenCalled();
  expect(
    screen.root.findByProps({ accessibilityRole: 'alert' }).props.children,
  ).toContain('Could not save');
});
