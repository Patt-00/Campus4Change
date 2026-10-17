import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { ProfileAvatarEditor } from '../src/features/profile/components/ProfileAvatarEditor';

test('a preset avatar replaces the selected local photo in the editor state', async () => {
  const onChange = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProfileAvatarEditor
        accountId="student-1"
        name="Student Example"
        avatarId="cyan"
        photoUri="file:///private/photo.jpg"
        onChange={onChange}
      />,
    );
  });

  const green = renderer.root.findAllByType(TouchableOpacity).find(control =>
    control.props.accessibilityLabel === 'Green avatar',
  );
  await act(async () => green.props.onPress());
  expect(onChange).toHaveBeenLastCalledWith({
    avatarId: 'green',
    photoUri: '',
  });
  await act(async () => renderer.unmount());
});
