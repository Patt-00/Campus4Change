import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EditProfileScreen } from '../src/features/profile/screens/EditProfileScreen';
import { tipCampuses } from '../src/shared/data/tipCampuses';
import { getTipProgram } from '../src/shared/data/tipPrograms';

jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return {
    SafeAreaProvider: ({ children }) =>
      R.createElement(R.Fragment, null, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});

const profile = {
  id: 'profile-test',
  name: 'Taylor Student',
  course: 'Computer Science',
  courseId: 'BSCS-QC',
  year: '3rd Year',
  school: 'TIP',
  studentId: 'STU-2048',
  avatarId: 'cyan',
  profilePhotoUri: '',
  interests: ['Programming'],
  interestGroups: [],
  tutorSubjects: [],
};

function findInput(renderer, label) {
  return renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === label);
}

test('normalizes legacy year labels and filters letters from year input', async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <EditProfileScreen
          back={jest.fn()}
          profile={profile}
          save={jest.fn()}
          firebaseAccount
        />
      </SafeAreaProvider>,
    );
  });

  expect(findInput(renderer, 'Year level').props.value).toBe('3');
  await ReactTestRenderer.act(async () => {
    findInput(renderer, 'Year level').props.onChangeText('2nd Year');
  });
  expect(findInput(renderer, 'Year level').props.value).toBe('2');
  await ReactTestRenderer.act(async () => {
    findInput(renderer, 'Year level').props.onChangeText('letters');
  });
  expect(findInput(renderer, 'Year level').props.value).toBe('');

  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('profile editing removes the legacy Student ID field', async () => {
  const save = jest.fn();
  const back = jest.fn();
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <EditProfileScreen
          back={back}
          profile={profile}
          save={save}
          firebaseAccount
        />
      </SafeAreaProvider>,
    );
  });

  expect(findInput(renderer, 'Student ID (private)')).toBeUndefined();
  const saveButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'SAVE CHANGES');
  await ReactTestRenderer.act(async () => saveButton.props.onPress());
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ year: '3' }),
    { requireCloud: false },
  );
  expect(save.mock.calls[0][0]).not.toHaveProperty('studentId');
  expect(back).toHaveBeenCalledWith({ force: true });

  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('account setup shows the generated UUID and requires TIP academic details', async () => {
  const save = jest.fn(async () => true);
  const onComplete = jest.fn();
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <EditProfileScreen
          setup
          profile={{
            ...profile,
            accountUuid: '00000000-0000-4000-8000-000000000010',
            course: '',
            courseId: '',
            campus: '',
            school: '',
            year: '',
          }}
          save={save}
          onComplete={onComplete}
          firebaseAccount
        />
      </SafeAreaProvider>,
    );
  });

  expect(findInput(renderer, 'Student ID (private)')).toBeUndefined();
  expect(
    renderer.root.findAllByType(Text).some(node =>
      String(node.props.children).includes('00000000-0000-4000-8000-000000000010'),
    ),
  ).toBe(true);
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findAllByType(TouchableOpacity)
      .find(button => button.props.accessibilityLabel === 'SAVE AND CONTINUE')
      .props.onPress();
  });
  expect(save).not.toHaveBeenCalled();
  expect(
    renderer.root.findAllByType(Text).some(node =>
      String(node.props.children).includes('Choose your TIP course or program.'),
    ),
  ).toBe(true);

  const courseSelector = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'Choose your TIP course or program');
  await ReactTestRenderer.act(async () => courseSelector.props.onPress());
  const programSearch = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.placeholder === 'Search programs or colleges');
  expect(programSearch).toBeDefined();
  await ReactTestRenderer.act(async () =>
    programSearch.props.onChangeText('Computer Science'),
  );
  const programOption = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel?.includes('Computer Science'));
  expect(programOption).toBeDefined();
  await ReactTestRenderer.act(async () => programOption.props.onPress());
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findAllByType(TouchableOpacity)
      .find(button => button.props.accessibilityLabel === 'SAVE AND CONTINUE')
      .props.onPress();
  });
  expect(save).not.toHaveBeenCalled();
  expect(
    renderer.root.findAllByType(Text).some(node =>
      String(node.props.children).includes('Enter your year level.'),
    ),
  ).toBe(true);
  await ReactTestRenderer.act(async () => {
    findInput(renderer, 'Year level').props.onChangeText('3');
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findAllByType(TouchableOpacity)
      .find(button => button.props.accessibilityLabel === 'SAVE AND CONTINUE')
      .props.onPress();
  });

  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ courseId: expect.any(String), campus: expect.any(String), year: '3' }),
    { requireCloud: true },
  );
  expect(onComplete).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('a failed Firebase profile setup stays on the setup screen', async () => {
  const save = jest.fn(async () => {
    throw new Error('Could not save account profile.');
  });
  const onComplete = jest.fn();
  const program = getTipProgram(
    'quezon-city-computer-studies-computer-science',
  );
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <EditProfileScreen
          setup
          profile={{
            ...profile,
            accountUuid: '00000000-0000-4000-8000-000000000011',
            course: program.name,
            courseId: program.id,
            year: '3',
            campus: program.campus,
          }}
          save={save}
          onComplete={onComplete}
        />
      </SafeAreaProvider>,
    );
  });
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findAllByType(TouchableOpacity)
      .find(button => button.props.accessibilityLabel === 'SAVE AND CONTINUE')
      .props.onPress();
  });
  expect(onComplete).not.toHaveBeenCalled();
  expect(
    renderer.root.findAllByType(Text).some(node =>
      String(node.props.children).includes('Could not save account profile.'),
    ),
  ).toBe(true);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('replaces free-text school with a TIP-only campus picker and saves its choice', async () => {
  const save = jest.fn();
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <EditProfileScreen
          back={jest.fn()}
          profile={profile}
          save={save}
          firebaseAccount
        />
      </SafeAreaProvider>,
    );
  });

  expect(findInput(renderer, 'School')).toBeUndefined();
  const campusButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'Campus: Choose your TIP campus');
  expect(campusButton).toBeDefined();
  await ReactTestRenderer.act(async () => campusButton.props.onPress());

  for (const campus of tipCampuses) {
    expect(
      renderer.root
        .findAllByType(TouchableOpacity)
        .some(button => button.props.accessibilityLabel === campus.label),
    ).toBe(true);
  }

  const quezonCity = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'Quezon City');
  await ReactTestRenderer.act(async () => quezonCity.props.onPress());
  const saveButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'SAVE CHANGES');
  await ReactTestRenderer.act(async () => saveButton.props.onPress());

  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ campus: 'T.I.P. Quezon City' }),
    { requireCloud: false },
  );
  expect(save.mock.calls[0][0]).not.toHaveProperty('school');
  await ReactTestRenderer.act(async () => renderer.unmount());
});
