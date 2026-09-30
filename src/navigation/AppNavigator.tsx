import React, {useState} from 'react';
import {HomeScreen} from '../features/home/screens/HomeScreen';
import {LoginScreen} from '../features/auth/screens/LoginScreen';
import {OnboardingScreen} from '../features/onboarding/screens/OnboardingScreen';
import {PlaceholderScreen} from '../features/demo/screens/PlaceholderScreen';
import {TutorDetailsScreen} from '../features/tutors/screens/TutorDetailsScreen';
import {TutorSearchScreen} from '../features/tutors/screens/TutorSearchScreen';
import type {Page} from './types';

export function AppNavigator() {
  const [page, setPage] = useState<Page>('Onboarding');
  const [logged, setLogged] = useState(false);

  if (page === 'Onboarding') {
    return <OnboardingScreen go={setPage} />;
  }

  if (page === 'Login') {
    return (
      <LoginScreen
        onAuth={() => {
          setLogged(true);
          setPage('Home');
        }}
      />
    );
  }

  if (page === 'Tutor Search') {
    return <TutorSearchScreen go={setPage} />;
  }

  if (page === 'Tutor Details') {
    return <TutorDetailsScreen go={setPage} />;
  }

  if (page === 'Home') {
    return <HomeScreen go={setPage} />;
  }

  // These tabs currently contain demonstration content, not live features.
  if (logged) {
    return <PlaceholderScreen page={page} go={setPage} />;
  }

  return <OnboardingScreen go={setPage} />;
}
