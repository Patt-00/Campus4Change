import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { InterestEditor } from '../src/features/profile/components/InterestEditor';

function renderEditor(props) {
  return ReactTestRenderer.create(<InterestEditor {...props} />);
}

test('custom interests are added to the selected TIP program group', async () => {
  const onChange = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderEditor({
      value: [],
      onChange,
      courseId: 'manila-computer-studies-computer-science',
      courseName: 'Computer Science',
    });
  });

  const topicInput = renderer.root.findAllByType(TextInput).find(input =>
    input.props.accessibilityLabel === 'Add an interest',
  );
  expect(topicInput).toBeDefined();
  await act(async () => topicInput.props.onChangeText('Graph Theory'));
  const addButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === 'ADD INTEREST');
  await act(async () => addButton.props.onPress());

  expect(onChange).toHaveBeenLastCalledWith([
    {
      id: 'manila-computer-studies-computer-science',
      programId: 'manila-computer-studies-computer-science',
      programName: 'Computer Science',
      campus: 'T.I.P. Manila',
      interests: ['Graph Theory'],
    },
  ]);
  await act(async () => renderer.unmount());
});

test('saved interest tags keep visible text without an unbounded flex height', async () => {
  const group = {
    id: 'manila-computer-studies-computer-science',
    programId: 'manila-computer-studies-computer-science',
    programName: 'Computer Science',
    campus: 'T.I.P. Manila',
    interests: ['Algorithms'],
  };
  let renderer;
  await act(async () => {
    renderer = renderEditor({
      value: [group],
      onChange: jest.fn(),
      courseId: group.programId,
      courseName: group.programName,
    });
  });

  const removeButton = renderer.root.findByProps({
    accessibilityLabel: 'Remove Algorithms',
  });
  const label = removeButton.findByType(Text);
  expect(label.props.children).toBe('Algorithms');
  expect(label.props.style.flexShrink).toBe(1);
  expect(label.props.style.flex).toBeUndefined();
  await act(async () => renderer.unmount());
});

test('draft interest count and empty group copy describe selections, not saved data', async () => {
  let renderer;
  await act(async () => {
    renderer = renderEditor({ value: [], onChange: jest.fn() });
  });

  const texts = renderer.root.findAllByType(Text);
  const count = texts.find(text =>
    Array.isArray(text.props.children) && text.props.children.join('') === '0/20 selected',
  );
  const copy = texts.map(text => text.props.children);
  expect(count).toBeDefined();
  expect(copy).toContain('Your selected topics will appear here grouped by course.');
  await act(async () => renderer.unmount());
});

test('course topic search filters core and specialization suggestions', async () => {
  let renderer;
  await act(async () => {
    renderer = renderEditor({
      value: [],
      onChange: jest.fn(),
      courseId: 'manila-computer-studies-computer-science',
      courseName: 'Computer Science',
    });
  });

  const search = renderer.root.findAllByType(TextInput).find(input =>
    input.props.accessibilityLabel === 'Search course topics',
  );
  expect(search).toBeDefined();
  await act(async () => search.props.onChangeText('natural language'));

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Natural language processing' }),
  ).toBeDefined();
  expect(
    renderer.root.findAllByType(TouchableOpacity).some(
      control => control.props.accessibilityLabel === 'Data structures and algorithms',
    ),
  ).toBe(false);
  await act(async () => renderer.unmount());
});
