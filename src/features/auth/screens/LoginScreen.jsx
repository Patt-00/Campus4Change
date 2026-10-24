import React, { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { s } from '../../../shared/theme/styles';

export function LoginScreen({ go, back, auth }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(
    !auth.firebaseConfigured,
  );
  const passwordInput = useRef(null);
  async function submit(action) {
    if (busy) {
      return;
    }
    setError('');
    setNotice('');
    setBusy(true);
    Keyboard.dismiss();
    try {
      const result = await action();
      if (result === false) {
        setNotice('Google sign-in was canceled. Choose an account to continue.');
      }
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  function signIn() {
    if (!identifier.trim() || !password) {
      setError('Enter your email and password.');
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
        'This device account needs its original password. Email recovery is not available for on-device accounts.',
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
      setError('Enter your email first so Firebase can send a reset link.');
      return;
    }
    submit(async () => {
      await auth.sendPasswordReset(identifier);
      Alert.alert(
        'Check your email',
        'If an account exists for this email, a reset link has been sent.',
      );
    });
  }
  return (
    <Screen title="Welcome back!" back={back}>
      <Text style={[s.muted, styles.marginLeft28marginBottom22]}>
        Sign in to continue
      </Text>
      {!auth.firebaseConfigured && (
        <Text style={[s.muted, styles.marginBottom12]}>
          Firebase is not configured yet. New accounts stay on this device.
        </Text>
      )}
      <Field
        label="Email"
        icon="@"
        placeholder="name@example.com"
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
        maxLength={1024}
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
      {notice ? <Text style={[s.muted, s.center]}>{notice}</Text> : null}
      <AppButton title="SIGN IN" busy={busy} onPress={signIn} />
      {auth.firebaseConfigured && !localOnly && (
        <>
          <Text style={[s.muted, s.center, styles.googleDivider]}>OR</Text>
          <GoogleAuthButton
            title="Continue with Google"
            busy={busy}
            disabled={!auth.googleSignInAvailable}
            onPress={() => submit(auth.signInWithGoogle)}
          />
          {!auth.googleSignInAvailable && (
            <Text style={[s.muted, s.center, styles.googleHelper]}>
              Google sign-in is not configured for this build yet.
            </Text>
          )}
        </>
      )}
      <View style={[s.row, styles.alignSelfcentermarginTop20]}>
        <Text style={s.muted}>Don't have an account?</Text>
        <Link label="Sign up" onPress={() => go('Sign Up')} />
      </View>
      {auth.firebaseConfigured && !localOnly && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            moreOptionsOpen ? 'Hide other options' : 'More sign-in options'
          }
          accessibilityState={{ expanded: moreOptionsOpen }}
          style={styles.otherOptionsToggle}
          onPress={() => setMoreOptionsOpen(value => !value)}
        >
          <Text style={s.link}>
            {moreOptionsOpen ? 'Hide other options' : 'More sign-in options'}
          </Text>
        </TouchableOpacity>
      )}
      {auth.firebaseConfigured && moreOptionsOpen && !localOnly && (
        <View style={styles.alignSelfcenter}>
          <Link
            label="Use existing on-device account"
            onPress={() => {
              setError('');
              setLocalOnly(true);
            }}
          />
        </View>
      )}
      {auth.firebaseConfigured && localOnly && (
        <View style={styles.alignSelfcenter}>
          <Link
            label="Back to Firebase sign-in"
            onPress={() => {
              setError('');
              setLocalOnly(false);
            }}
          />
        </View>
      )}
      <View style={styles.aboutLink}>
        <Link label="About Campus4Change" onPress={() => go('About')} />
      </View>
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
  googleDivider: { marginTop: 14, marginBottom: 2 },
  googleHelper: { marginTop: 8 },
  otherOptionsToggle: { alignSelf: 'center', marginTop: 4 },
  aboutLink: { alignSelf: 'center', marginTop: 4 },
});
