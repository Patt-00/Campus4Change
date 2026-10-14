import React, { useRef, useState } from 'react';
import { Keyboard, Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field, Link } from '../../../shared/components/UI';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { s } from '../../../shared/theme/styles';

const GOOGLE_SIGN_IN_CANCELLED =
  'Google sign-in did not complete. Try again or use email and password.';

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
      password.length < 8 || password.length > 1024
    ) {
      setError(
        'Complete all fields with a valid email. Use 8–1024 characters for the password.',
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

  async function submitGoogle() {
    if (busy || !auth.googleSignInAvailable) {
      return;
    }
    setError('');
    setBusy(true);
    Keyboard.dismiss();
    try {
      const signedIn = await auth.signInWithGoogle();
      if (signedIn === false) {
        setError(GOOGLE_SIGN_IN_CANCELLED);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Create account" back={back}>
      <Text style={[s.muted, styles.marginLeft28marginBottom20]}>
        {auth.firebaseConfigured
          ? 'Create your Campus4Change account'
          : 'Create your account on this device'}
      </Text>
      {auth.firebaseConfigured && (
        <>
          <GoogleAuthButton
            title="Sign up with Google"
            busy={busy}
            disabled={!auth.googleSignInAvailable}
            onPress={submitGoogle}
          />
          <Text style={[s.muted, s.center, styles.googleHelper]}>
            Google supplies your name and email. Add your private Student ID in
            Edit Profile after signing in.
          </Text>
          {!auth.googleSignInAvailable && (
            <Text style={[s.muted, s.center, styles.googleHelper]}>
              Google sign-in is not configured for this build yet.
            </Text>
          )}
          <Text style={[s.muted, s.center, styles.googleDivider]}>
            OR SIGN UP WITH EMAIL
          </Text>
        </>
      )}
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
        label="Email"
        inputRef={emailInput}
        icon="@"
        placeholder="name@example.com"
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
        maxLength={1024}
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
        {auth.firebaseConfigured
          ? 'Email/password accounts receive a verification link. Google accounts use your verified Google email. Shared study groups, tutor listings, and session requests require a verified email.'
          : 'Your account and data stay on this device.'}
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
  googleHelper: { marginTop: 8 },
  googleDivider: { marginTop: 16, marginBottom: 10 },
  alignItemscentermarginTop24: {
    alignItems: 'center',
    marginTop: 24,
  },
});
