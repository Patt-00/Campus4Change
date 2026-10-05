import { useState } from 'react';
import logo from '../assets/campus4change-logo.png';
import PrimaryButton from './PrimaryButton.jsx';
import './AuthScreen.css';

export default function AuthScreen({ mode, onNavigate }) {
  const signup = mode === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');

  function submit(event) {
    event.preventDefault();
    setStatus(signup
      ? 'Form checked! This browser preview does not create or save accounts.'
      : 'Form checked! This browser preview does not sign in or save passwords.');
    event.currentTarget.reset();
  }

  return (
    <main className="auth" aria-labelledby="auth-title">
      <button className="text-button auth-back" onClick={() => onNavigate(signup ? 'login' : 'intro/3')}>
        ← {signup ? 'Sign in' : 'Introduction'}
      </button>
      <img className="auth-logo" src={logo} alt="Campus4Change" />
      <h1 id="auth-title">{signup ? 'Create account' : 'Welcome back!'}</h1>
      <p className="auth-subtitle">{signup ? 'Start learning and making a difference together.' : 'Your campus community is waiting for you.'}</p>
      <p className="preview-notice">Browser preview · Use sample details only. Accounts are not saved.</p>
      <form className="auth-form" onSubmit={submit}>
        {signup && <label className="form-field">Full name<input name="name" autoComplete="name" required maxLength={100} placeholder="Juan Dela Cruz" /></label>}
        <label className="form-field">{signup ? 'School email' : 'Email or Student ID'}
          <input name="identity" type={signup ? 'email' : 'text'} autoComplete={signup ? 'email' : 'username'} required maxLength={150} placeholder={signup ? 'student@example.edu' : 'Enter your email or student ID'} />
        </label>
        {signup && <label className="form-field">Student ID<input name="studentId" required maxLength={50} placeholder="Enter your student ID" /></label>}
        <label className="form-field" htmlFor="password">Password</label>
        <div className="password-field">
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : 1} required placeholder={signup ? 'At least 8 characters' : 'Enter your password'} />
          <button type="button" className="password-toggle" aria-controls="password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>
        <PrimaryButton type="submit">{signup ? 'Create account' : 'Sign in'}</PrimaryButton>
        <p className="form-status" role="status">{status}</p>
      </form>
      <p className="auth-switch">{signup ? 'Already have an account?' : 'New to Campus4Change?'}{' '}
        <button className="text-button" onClick={() => onNavigate(signup ? 'login' : 'signup')}>{signup ? 'Sign in' : 'Sign up'}</button>
      </p>
    </main>
  );
}
