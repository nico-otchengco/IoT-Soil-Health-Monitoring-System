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



    // 1. Verify the device token exists in the device table
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

    // After verifying device exists, add this check:
    const { data: existingLink } = await sb
        .from('user_device')
        .select('user_id')
        .eq('dev_id', device.id)
        .single();

    if (existingLink) {
        setError('This device token is already registered to another account.');
        setIsLoading(false);
        return;
    }

    // 2. Create the Supabase auth user
    const { data: authData, error: signUpError } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          device_id: device.id,   // store device reference in user metadata
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    const tokenRegex = /^ESP32\.[A-Z0-9]{5}\.WROOM0XC\d+$/;

    if (!tokenRegex.test(deviceToken)) {
        setError('Invalid device token format. Expected: ESP32.XXXXX.WROOM0XC1');
        setIsLoading(false);
        return;
    }

    // 3. If email confirmation is disabled in Supabase, user is immediately active
    if (authData.session) {
      onSignupSuccess();
    } else {
      // Email confirmation is enabled — let the user know
      setError('Account created! Please check your email to confirm your account before signing in.');
    }

    if (authData.user) {
        await sb.from('user_device').insert({
        user_id: authData.user.id,
        dev_id: device.id,
     });
    }

    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">SMARTSOIL</h1>
          <p className="auth-subtitle">Create your account to get started</p>
        </div>

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
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="device-token" className="form-label">Device Token</label>
            <input
              id="device-token"
              type="text"
              value={deviceToken}
              onChange={(e) => setDeviceToken(e.target.value)}
              required
              className="form-input"
              placeholder="Your device's ingestion token"
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-password" className="form-label">Password</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder="Create a password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password" className="form-label">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="form-input"
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" disabled={isLoading} className="auth-button">
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

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