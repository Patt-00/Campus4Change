import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';
export type AuthActions = {
  signIn: (id: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    studentId: string,
    password: string,
  ) => Promise<void>;
  biometrics: () => Promise<void>;
};
export function LoginScreen({
  go,
  back,
  auth,
}: {
  go: Navigate;
  back: () => void;
  auth: AuthActions;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(action: () => Promise<void>) {
    if (busy) {
      return;
    }
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Welcome back!" back={back}>
      <Text style={[s.muted, styles.marginLeft28marginBottom22]}>
        Sign in to continue
      </Text>
      <Field
        label="Email or Student ID"
        icon="@"
        placeholder="Enter your email or student ID"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field
        label="Password"
        icon="•"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.alignItemsflexend}>
        <Link
          label="Forgot password?"
          onPress={() =>
            Alert.alert(
              'Local account recovery',
              'This prototype has no email recovery service. Use the demo account for the class demonstration. Your own account needs the password used when it was created.',
            )
          }
        />
      </View>
      <ErrorText value={error} />
      <AppButton
        title="SIGN IN"
        busy={busy}
        onPress={() => {
          if (!identifier.trim() || !password) {
            setError('Enter your email or Student ID and password.');
            return;
          }
          submit(() => auth.signIn(identifier, password));
        }}
      />
      <Text style={[s.muted, s.center, styles.marginVertical20]}>OR</Text>
      <AppButton
        title="SIGN IN WITH BIOMETRICS"
        outline
        disabled={busy}
        onPress={() => submit(auth.biometrics)}
      />
      <View style={[s.row, styles.alignSelfcentermarginTop20]}>
        <Text style={s.muted}>Don't have an account?</Text>
        <Link label="Sign up" onPress={() => go('Sign Up')} />
      </View>
      <View style={s.bigGap} />
      <Text style={[s.muted, s.center]}>
        Local school prototype. Accounts stay on this device.
      </Text>
      <AppButton
        title="USE DEMO ACCOUNT"
        outline
        disabled={busy}
        onPress={() =>
          submit(() => auth.signIn('alex@campus.demo', 'Campus123!'))
        }
      />
    </Screen>
  );
}
export function SignUpScreen({
  go,
  back,
  auth,
}: {
  go: Navigate;
  back: () => void;
  auth: AuthActions;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
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
        Join your campus learning network
      </Text>
      <Field
        label="Full name"
        icon="N"
        placeholder="Enter your full name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <Field
        label="School email"
        icon="@"
        placeholder="name@school.edu"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field
        label="Student ID"
        icon="#"
        placeholder="Enter your student ID"
        value={studentId}
        onChangeText={setStudentId}
        autoCapitalize="none"
      />
      <Field
        label="Password"
        icon="•"
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ErrorText value={error} />
      <View style={s.gap} />
      <AppButton title="CREATE ACCOUNT" busy={busy} onPress={submit} />
      <Text style={[s.muted, s.center, styles.marginTop16]}>
        Local prototype. Your account and data stay on this device.
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
  marginLeft28marginBottom22: {
    marginLeft: 28,
    marginBottom: 22,
  },
  alignItemsflexend: {
    alignItems: 'flex-end',
  },
  marginVertical20: {
    marginVertical: 20,
  },
  alignSelfcentermarginTop20: {
    alignSelf: 'center',
    marginTop: 20,
  },
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
