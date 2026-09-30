import React, {useState} from 'react';
import {HomeScreen} from './src/screens/HomeScreen';
import {LoginScreen} from './src/screens/LoginScreen';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {PlaceholderScreen} from './src/screens/PlaceholderScreen';
import {TutorDetailsScreen} from './src/screens/TutorDetailsScreen';
import {TutorSearchScreen} from './src/screens/TutorSearchScreen';
import type {Page} from './src/types/navigation';

export default function App() {
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
