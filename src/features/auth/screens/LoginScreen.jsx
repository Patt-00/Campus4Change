import React, { useRef, useState } from 'react';
import { Alert, Keyboard, Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';
import { s } from '../../../shared/theme/styles';

export function LoginScreen({ go, back, auth }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const passwordInput = useRef(null);
  async function submit(action) {
    if (busy) {
      return;
    }
    setError('');
    setBusy(true);
    Keyboard.dismiss();
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function signIn() {
    if (!identifier.trim() || !password) {
      setError(
        auth.firebaseConfigured && !localOnly
          ? 'Enter your school email and password.'
          : 'Enter your email or Student ID and password.',
      );
      return;
    }
    submit(() =>
      localOnly
        ? auth.signInLocal(identifier, password)
        : auth.signIn(identifier, password),
    );
  }
  function forgotPassword() {
    if (!auth.firebaseConfigured || localOnly) {
      Alert.alert(
        'Local account recovery',
        'This device account needs its original password. Email recovery is not available. The demo account remains available without your password.',
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      setError('Enter your school email first so Firebase can send a reset link.');
      return;
    }
    submit(async () => {
      await auth.sendPasswordReset(identifier);
      Alert.alert('Check your email', 'Firebase sent a password reset link.');
    });
  }
  return (
    <Screen title="Welcome back!" back={back}>
      <Text style={[s.muted, styles.marginLeft28marginBottom22]}>
        Sign in to continue
      </Text>
      {!auth.firebaseConfigured && (
        <Text style={[s.muted, styles.marginBottom12]}>
          Firebase is not configured yet. Demo and new local accounts stay on this device.
        </Text>
      )}
      <Field
        label={auth.firebaseConfigured && !localOnly ? 'School email' : 'Email or Student ID'}
        icon="@"
        placeholder={
          auth.firebaseConfigured && !localOnly
            ? 'name@school.edu'
            : 'Enter your email or student ID'
        }
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordInput.current?.focus()}
        submitBehavior="submit"
      />

      <Field
        label="Password"
        inputRef={passwordInput}
        icon="•"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={signIn}
      />

      {!localOnly && (
        <View style={styles.alignItemsflexend}>
          <Link label="Forgot password?" onPress={forgotPassword} />
        </View>
      )}
      <ErrorText value={error} />
      <AppButton title="SIGN IN" busy={busy} onPress={signIn} />
      {(!auth.firebaseConfigured || localOnly) && (
        <>
          <Text style={[s.muted, s.center, styles.marginVertical20]}>OR</Text>
          <AppButton
            title="SIGN IN WITH BIOMETRICS"
            outline
            disabled={busy}
            onPress={() => submit(auth.biometrics)}
          />
        </>
      )}

      <View style={[s.row, styles.alignSelfcentermarginTop20]}>
        <Text style={s.muted}>Don't have an account?</Text>
        <Link label="Sign up" onPress={() => go('Sign Up')} />
      </View>
      {auth.firebaseConfigured && (
        <View style={styles.alignSelfcenter}>
          <Link
            label={localOnly ? 'Back to Firebase sign-in' : 'Use existing on-device account'}
            onPress={() => {
              setError('');
              setLocalOnly(!localOnly);
            }}
          />
        </View>
      )}
      <View style={s.bigGap} />
      <Link label="About Campus4Change" onPress={() => go('About')} />
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
const styles = StyleSheet.create({
  marginLeft28marginBottom22: {
    marginLeft: 28,
    marginBottom: 22,
  },
  marginBottom12: { marginBottom: 12 },
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
  alignSelfcenter: { alignSelf: 'center' },
});
