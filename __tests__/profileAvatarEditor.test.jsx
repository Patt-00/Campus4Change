import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  NativeModules,
  PermissionsAndroid,
  Text,
  TouchableOpacity,
} from 'react-native';
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

test('restores a camera photo after Android recreates the app process', async () => {
  const originalStorage = NativeModules.CampusStorage;
  const consumePendingProfilePhoto = jest
    .fn()
    .mockResolvedValue('file:///private/recovered-photo.jpg');
  NativeModules.CampusStorage = { consumePendingProfilePhoto };
  const onChange = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProfileAvatarEditor
        accountId="student-1"
        name="Student Example"
        avatarId="cyan"
        photoUri=""
        onChange={onChange}
      />,
    );
  });

  expect(consumePendingProfilePhoto).toHaveBeenCalledWith('student-1');
  expect(onChange).toHaveBeenCalledWith({
    photoUri: 'file:///private/recovered-photo.jpg',
  });

  await act(async () => renderer.unmount());
  if (originalStorage === undefined) {
    delete NativeModules.CampusStorage;
  } else {
    NativeModules.CampusStorage = originalStorage;
  }
});

test('taking a profile photo requests camera permission and saves through Android storage', async () => {
  const originalStorage = NativeModules.CampusStorage;
  const captureProfilePhoto = jest
    .fn()
    .mockResolvedValue('file:///private/captured-photo.jpg');
  NativeModules.CampusStorage = { captureProfilePhoto };
  const requestPermission = jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  const onChange = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProfileAvatarEditor
        accountId="student-1"
        name="Student Example"
        avatarId="cyan"
        photoUri=""
        onChange={onChange}
      />,
    );
  });

  expect(requestPermission).not.toHaveBeenCalled();
  const takePhoto = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === 'TAKE A PHOTO');
  await act(async () => takePhoto.props.onPress());

  expect(requestPermission).toHaveBeenCalledWith(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    expect.objectContaining({
      message: expect.stringContaining('only when you choose'),
    }),
  );
  expect(captureProfilePhoto).toHaveBeenCalledWith('student-1');
  expect(onChange).toHaveBeenCalledWith({
    photoUri: 'file:///private/captured-photo.jpg',
  });

  await act(async () => renderer.unmount());
  requestPermission.mockRestore();
  if (originalStorage === undefined) {
    delete NativeModules.CampusStorage;
  } else {
    NativeModules.CampusStorage = originalStorage;
  }
});

test('denying camera permission keeps photo choice and presets available', async () => {
  const originalStorage = NativeModules.CampusStorage;
  const captureProfilePhoto = jest.fn();
  NativeModules.CampusStorage = { captureProfilePhoto };
  const requestPermission = jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  const onChange = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProfileAvatarEditor
        accountId="student-1"
        name="Student Example"
        avatarId="cyan"
        photoUri=""
        onChange={onChange}
      />,
    );
  });

  const takePhoto = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === 'TAKE A PHOTO');
  await act(async () => takePhoto.props.onPress());

  expect(captureProfilePhoto).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
  expect(
    renderer.root.findAllByType(Text).some(control =>
      String(control.props.children).includes('Camera access is needed'),
    ),
  ).toBe(true);
  expect(
    renderer.root
      .findAllByType(TouchableOpacity)
      .some(control => control.props.accessibilityLabel === 'CHOOSE A PHOTO'),
  ).toBe(true);

  await act(async () => renderer.unmount());
  requestPermission.mockRestore();
  if (originalStorage === undefined) {
    delete NativeModules.CampusStorage;
  } else {
    NativeModules.CampusStorage = originalStorage;
  }
});

test('choosing an existing photo does not request camera permission', async () => {
  const originalStorage = NativeModules.CampusStorage;
  const pickProfilePhoto = jest
    .fn()
    .mockResolvedValue('file:///private/picked-photo.jpg');
  NativeModules.CampusStorage = { pickProfilePhoto };
  const requestPermission = jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  const onChange = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProfileAvatarEditor
        accountId="student-1"
        name="Student Example"
        avatarId="cyan"
        photoUri=""
        onChange={onChange}
      />,
    );
  });

  const choosePhoto = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === 'CHOOSE A PHOTO');
  await act(async () => choosePhoto.props.onPress());

  expect(requestPermission).not.toHaveBeenCalled();
  expect(pickProfilePhoto).toHaveBeenCalledWith('student-1');
  expect(onChange).toHaveBeenCalledWith({
    photoUri: 'file:///private/picked-photo.jpg',
  });

  await act(async () => renderer.unmount());
  requestPermission.mockRestore();
  if (originalStorage === undefined) {
    delete NativeModules.CampusStorage;
  } else {
    NativeModules.CampusStorage = originalStorage;
  }
});
