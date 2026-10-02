import React, { useRef, useState } from 'react';
import { Keyboard, Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';
import { s } from '../../../shared/theme/styles';

export function SignUpScreen({ go, back, auth }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const emailInput = useRef(null);
  const idInput = useRef(null);
  const passwordInput = useRef(null);
  async function submit() {
    if (busy) {
      return;
    }
    setError('');
    if (
      name.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !studentId.trim() ||
      password.length < 8
    ) {
      setError(
        'Complete all fields with a valid email. Use at least 8 characters for the password.',
      );
      return;
    }
    setBusy(true);
    Keyboard.dismiss();
    try {
      await auth.signUp(name, email, studentId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Create account" back={back}>
      <Text style={[s.muted, styles.marginLeft28marginBottom20]}>
        Create your account on this device
      </Text>
      <Field
        label="Full name"
        icon="N"
        placeholder="Enter your full name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailInput.current?.focus()}
      />

      <Field
        label="School email"
        inputRef={emailInput}
        icon="@"
        placeholder="name@school.edu"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => idInput.current?.focus()}
      />

      <Field
        label="Student ID"
        inputRef={idInput}
        icon="#"
        placeholder="Enter your student ID"
        value={studentId}
        onChangeText={setStudentId}
        autoCapitalize="none"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordInput.current?.focus()}
      />

      <Field
        label="Password"
        inputRef={passwordInput}
        icon="•"
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <ErrorText value={error} />
      <View style={s.gap} />
      <AppButton title="CREATE ACCOUNT" busy={busy} onPress={submit} />
      <Text style={[s.muted, s.center, styles.marginTop16]}>
        Your account and data stay on this device.
      </Text>
      <View style={styles.alignItemscentermarginTop24}>
        <Link
          label="Already have an account? Sign in"
          onPress={() => go('Login')}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  marginLeft28marginBottom20: {
    marginLeft: 28,
    marginBottom: 20,
  },
  marginTop16: {
    marginTop: 16,
  },
  alignItemscentermarginTop24: {
    alignItems: 'center',
    marginTop: 24,
  },
});
