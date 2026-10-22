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

test('normalizes legacy Student IDs and keeps the edited ID digits-only', async () => {
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

  expect(findInput(renderer, 'Student ID (private)').props.value).toBe('2048');
  await ReactTestRenderer.act(async () => {
    findInput(renderer, 'Student ID (private)').props.onChangeText('A12-3B');
  });
  const studentIdInput = findInput(renderer, 'Student ID (private)');
  expect(studentIdInput.props.value).toBe('123');
  expect(studentIdInput.props.keyboardType).toBe('number-pad');
  const saveButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'SAVE CHANGES');
  await ReactTestRenderer.act(async () => saveButton.props.onPress());
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ studentId: '123', year: '3' }),
  );
  expect(back).toHaveBeenCalledWith({ force: true });

  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('account setup requires a numeric Student ID and TIP academic details', async () => {
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
            course: '',
            courseId: '',
            campus: '',
            school: '',
            studentId: '',
          }}
          save={save}
          onComplete={onComplete}
        />
      </SafeAreaProvider>,
    );
  });

  expect(findInput(renderer, 'Student ID (private)')).toBeDefined();
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
      String(node.props.children).includes('Enter your TIP Student ID.'),
    ),
  ).toBe(true);

  await ReactTestRenderer.act(async () => {
    findInput(renderer, 'Student ID (private)').props.onChangeText('ID-001234');
  });
  expect(findInput(renderer, 'Student ID (private)').props.value).toBe('001234');
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findAllByType(TouchableOpacity)
      .find(button => button.props.accessibilityLabel === 'SAVE AND CONTINUE')
      .props.onPress();
  });

  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ studentId: '001234', courseId: expect.any(String), campus: expect.any(String) }),
  );
  expect(onComplete).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('a duplicate Student ID keeps account setup open with the backend error', async () => {
  const save = jest.fn(async () => {
    throw new Error('That Student ID is already in use, or could not be verified.');
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
            studentId: '2026000001',
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
      String(node.props.children).includes('That Student ID is already in use'),
    ),
  ).toBe(true);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('an unknown existing Student ID claim shows a read-only retry screen', async () => {
  const save = jest.fn();
  const retryStudentIdClaim = jest.fn(async () => 'unknown');
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <EditProfileScreen
          setup
          firebaseAccount
          studentIdClaimStatus="unknown"
          retryStudentIdClaim={retryStudentIdClaim}
          profile={profile}
          save={save}
        />
      </SafeAreaProvider>,
    );
  });

  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(
    renderer.root.findAllByType(Text).some(node =>
      String(node.props.children).includes(
        'Student ID verification is unavailable',
      ),
    ),
  ).toBe(true);
  expect(
    renderer.root.findAllByType(TouchableOpacity).some(
      button => button.props.accessibilityLabel === 'SAVE AND CONTINUE',
    ),
  ).toBe(false);

  const retryButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'RETRY VERIFICATION');
  await ReactTestRenderer.act(async () => retryButton.props.onPress());

  expect(retryStudentIdClaim).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('a successful Student ID claim retry completes account setup', async () => {
  const onComplete = jest.fn();
  const retryStudentIdClaim = jest.fn(async () => 'claimed');
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <EditProfileScreen
          setup
          firebaseAccount
          studentIdClaimStatus="unknown"
          retryStudentIdClaim={retryStudentIdClaim}
          onComplete={onComplete}
          profile={profile}
          save={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  const retryButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'RETRY VERIFICATION');
  await ReactTestRenderer.act(async () => retryButton.props.onPress());

  expect(retryStudentIdClaim).toHaveBeenCalledTimes(1);
  expect(onComplete).toHaveBeenCalledTimes(1);
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
  );
  expect(save.mock.calls[0][0]).not.toHaveProperty('school');
  await ReactTestRenderer.act(async () => renderer.unmount());
});
