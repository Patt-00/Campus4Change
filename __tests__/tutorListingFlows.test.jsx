import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { CreateScreen } from '../src/features/create/screens/CreateScreen';
import { BeTutorScreen } from '../src/features/profile/screens/BeTutorScreen';
import { TutorSearchScreen } from '../src/features/tutors/screens/TutorSearchScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function renderScreen(screen) {
  return ReactTestRenderer.create(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {screen}
    </SafeAreaProvider>,
  );
}

function button(renderer, label) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === label);
}

function input(renderer, label) {
  return renderer.root
    .findAllByType(TextInput)
    .find(control => control.props.accessibilityLabel === label);
}

test('Create screen routes all three actions to their intended flows', async () => {
  const go = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderScreen(<CreateScreen go={go} />);
  });

  const routes = [
    ['BOOK A SESSION', 'Tutor Search'],
    ['CREATE STUDY GROUP', 'Create Group'],
    ['BE A TUTOR', 'Be a Tutor'],
  ];
  for (const [label, destination] of routes) {
    await act(async () => button(renderer, label).props.onPress());
    expect(go).toHaveBeenLastCalledWith(destination);
  }
  await act(async () => renderer.unmount());
});

test('tutor listing requires a subject and a sufficiently long introduction', async () => {
  const save = jest.fn();
  const back = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <BeTutorScreen
        back={back}
        profile={{ tutorSubjects: [], bio: '' }}
        save={save}
      />,
    );
  });

  await act(async () => button(renderer, 'SAVE TUTOR PROFILE').props.onPress());
  const messages = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(messages).toContain(
    'Add at least one subject and an introduction of at least 10 characters.',
  );
  expect(save).not.toHaveBeenCalled();
  expect(back).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

test('tutor listing trims subjects and removes case-insensitive duplicates', async () => {
  const save = jest.fn();
  const back = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <BeTutorScreen
        back={back}
        profile={{ tutorSubjects: [], bio: '' }}
        save={save}
      />,
    );
  });

  await act(async () =>
    input(renderer, 'Subjects (separate with commas)').props.onChangeText(
      ' Physics  , PHYSICS, Calculus ',
    ),
  );
  await act(async () =>
    input(renderer, 'About you').props.onChangeText(
      'I can help students understand physics and calculus.',
    ),
  );
  await act(async () => button(renderer, 'SAVE TUTOR PROFILE').props.onPress());

  expect(save).toHaveBeenCalledWith({
    tutorSubjects: ['Physics', 'Calculus'],
    bio: 'I can help students understand physics and calculus.',
  });
  expect(back).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('tutor owner can remove an existing listing', async () => {
  const save = jest.fn();
  const back = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <BeTutorScreen
        back={back}
        profile={{ tutorSubjects: ['Writing'], bio: 'Writing help for students.' }}
        save={save}
      />,
    );
  });

  await act(async () => button(renderer, 'Remove tutor listing').props.onPress());
  expect(save).toHaveBeenCalledWith({ tutorSubjects: [], bio: '' });
  expect(back).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('tutor subject filters collapse spelling variants', async () => {
  const list = [
    {
      id: 'sample',
      name: 'Mika Santos',
      subjects: ['Physics'],
      rating: 4.9,
      sessions: 12,
      response: 95,
      available: true,
      sample: true,
    },
    {
      id: 'own',
      name: 'Your listing',
      subjects: [' physics ', 'Calculus'],
      rating: 0,
      available: true,
      own: true,
    },
  ];
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <TutorSearchScreen go={jest.fn()} back={jest.fn()} list={list} />,
    );
  });

  await act(async () => button(renderer, 'Subjects').props.onPress());
  const labels = renderer.root
    .findAllByType(TouchableOpacity)
    .map(control => control.props.accessibilityLabel);
  expect(labels.filter(label => label === 'Physics')).toHaveLength(1);
  expect(labels.filter(label => label === 'physics')).toHaveLength(0);
  expect(labels.filter(label => label === 'Calculus')).toHaveLength(1);
  await act(async () => renderer.unmount());
});
