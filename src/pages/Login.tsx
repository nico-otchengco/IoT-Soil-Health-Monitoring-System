import { useState, useEffect } from 'react';
import { sb } from '../SBClient';

interface LoginProps {
  onSwitchToSignUp: () => void;
  onLoginSuccess: () => void;
}

export function Login({ onSwitchToSignUp, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onLoginSuccess();
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">

        {/* Logo */}
        <div className="auth-logo">
          <img
            src="assets/SMARTSOIL-LOGO.png"
            alt="SmartSoil Logo"
            style={{ width: '15rem', height: '15rem', objectFit: 'contain' }}
          />
        </div>
        <p className="auth-subtitle">Sign in to access your dashboard</p>

        {/* Card */}
        <div className="auth-card">
          <form onSubmit={handleLogin} className="auth-form">

            {error && (
              <p style={{ color: 'red', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {error}
              </p>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M2 7l10 7 10-7"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input with-icon"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input with-icon"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-text">Remember me</span>
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            <button type="submit" disabled={isLoading} className="auth-button">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          <p className="auth-footer-text">
            Don't have an account?{' '}
            <button onClick={onSwitchToSignUp} className="auth-link">Sign up</button>
          </p>
        </div>
      </div>
    </div>
  );
}