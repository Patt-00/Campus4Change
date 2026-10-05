import { useEffect } from 'react';
import './App.css';
import PhoneScreenLayout from './components/PhoneScreenLayout.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import IntroSlideshow from './components/IntroSlideshow.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import useRoute from './hooks/useRoute.js';

function App() {
  const [route, navigate] = useRoute();

  useEffect(() => {
    if (route !== 'splash') return;
    const timer = setTimeout(() => navigate('intro/1'), 3000);
    return () => clearTimeout(timer);
  }, [route, navigate]);

  useEffect(() => {
    const title = route === 'login' ? 'Sign in' : route === 'signup' ? 'Create account' : 'Welcome';
    document.title = `${title} · Campus4Change`;
    document.querySelector('.phone')?.scrollTo(0, 0);
  }, [route]);

  const introIndex = route.startsWith('intro/') ? Number(route.split('/')[1]) - 1 : null;

  return (
    <PhoneScreenLayout>
      {route === 'splash' && <SplashScreen />}
      {introIndex !== null && (
        <IntroSlideshow
          index={introIndex}
          onSelect={index => navigate(`intro/${index + 1}`)}
          onFinish={() => navigate('login')}
        />
      )}
      {(route === 'login' || route === 'signup') && (
        <AuthScreen key={route} mode={route} onNavigate={navigate} />
      )}
    </PhoneScreenLayout>
  );
}

export default App;
