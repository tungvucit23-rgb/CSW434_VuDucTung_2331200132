/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  let app: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(<App />);
  });
  expect(app!.root.findByProps({ testID: 'name-input' })).toBeDefined();
  await ReactTestRenderer.act(() => {
    app!.unmount();
  });
});
