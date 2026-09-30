/**
 * @format
 */

import React from 'react';
import {Text, TouchableOpacity} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('moves through the prototype screens using visible controls', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const hasText = (value: string) =>
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === value);

  const press = async (label: string) => {
    const control = renderer.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node
          .findAllByType(Text)
          .some(text => text.props.children === label),
      );
    expect(control).toBeDefined();
    await ReactTestRenderer.act(async () => {
      control!.props.onPress();
    });
  };

  expect(hasText('GET STARTED')).toBe(true);
  await press('GET STARTED');
  expect(hasText('Welcome back!')).toBe(true);
  await press('SIGN IN');
  expect(hasText('Hello, Alex!')).toBe(true);
  await press('FIND A TUTOR');
  expect(hasText('Recommended tutors')).toBe(true);
  await press('Jamie Dela Cruz');
  expect(hasText('Tutor Profile')).toBe(true);
  await press('BOOK SESSION');
  expect(hasText('Sessions')).toBe(true);
  await press('Messages');
  expect(hasText('See you at 2 PM.')).toBe(true);
  await press('Profile');
  expect(hasText('Alex Rivera')).toBe(true);
});
