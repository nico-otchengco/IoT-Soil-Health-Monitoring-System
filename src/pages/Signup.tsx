import { useState } from 'react';
import { sb } from '../SBClient';

interface SignupProps {
  onSwitchToLogin: () => void;
  onSignupSuccess: () => void;
}

export function Signup({ onSwitchToLogin, onSignupSuccess }: SignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    const { data: device, error: deviceError } = await sb
      .from('device')
      .select('id, ing_tok')
      .eq('ing_tok', deviceToken)
      .single();

    if (deviceError || !device) {
      setError('Device token not found. Please check your token and try again.');
      setIsLoading(false);
      return;
    }

    const { data: existingLink } = await sb
      .from('user_device')
      .select('user_id')
      .eq('dev_id', device.id)
      .maybeSingle();

    if (existingLink) {
      setError('This device token is already registered to another account.');
      setIsLoading(false);
      return;
    }

    const { data: authData, error: signUpError } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { device_id: device.id },
      },
    });

    if (signUpError || !authData.user) {
      setError(signUpError?.message ?? 'Signup failed.');
      setIsLoading(false);
      return;
    }

    const { error: linkError } = await sb
      .from('user_device')
      .insert({
        user_id: authData.user.id,
        dev_id: device.id,
      });

    if (linkError) {
      if (linkError.code === '23505') {
        setError('This device token is already registered to another account.');
      } else {
        setError('Failed to link device to user. Please try again.');
      }
      setIsLoading(false);
      return;
    }

    if (authData.session) {
      onSignupSuccess();
    } else {
      setError('Account created! Please check your email to confirm your account before signing in.');
    }

    setIsLoading(false);
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

        <p className="auth-subtitle">Create your account to get started</p>

        {/* Card */}
        <div className="auth-card">
          <form onSubmit={handleSignUp} className="auth-form">

            {error && (
              <p style={{
                color: error.startsWith('Account created') ? 'green' : 'red',
                fontSize: '0.85rem',
                marginBottom: '0.5rem'
              }}>
                {error}
              </p>
            )}

            <div className="form-group">
              <label htmlFor="signup-email" className="form-label">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M2 7l10 7 10-7"/>
                  </svg>
                </span>
                <input
                  id="signup-email"
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
              <label htmlFor="device-token" className="form-label">Device Token</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2"/>
                    <line x1="12" y1="18" x2="12" y2="18.5" strokeWidth="3"/>
                  </svg>
                </span>
                <input
                  id="device-token"
                  type="text"
                  value={deviceToken}
                  onChange={(e) => setDeviceToken(e.target.value)}
                  required
                  className="form-input with-icon"
                  placeholder="Your device's ingestion token"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signup-password" className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input with-icon"
                  placeholder="Create a password"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password" className="form-label">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7F5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input with-icon"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="auth-button">
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        <div className="auth-footer">
          <p className="auth-footer-text">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="auth-link">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}