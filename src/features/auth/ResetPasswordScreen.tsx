import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword } from '../../shared/lib/authApi';
import './LoginScreen.css';

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!token) {
      setError("This reset link is invalid");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters for your password");
      return;
    }
    if (password !== passwordConfirm) {
      setError("The passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setInfo("Password updated. You can sign in now.");
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" data-page="2">
      <img src="/backgrounds/webbackground.png" alt="Login Background" className="login-background" />
      <div className="login-overlay" />
      <div className="login-container animate-fadeIn">
        <header className="login-header">
          <h1 className="login-logo">
            <img src="/backgrounds/logo.png" alt="Chezzies" className="login-logo-img-large" />
          </h1>
          <p className="login-subtitle">New password</p>
        </header>

        <main className="login-main">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="passwordConfirm">
                Repeat password
              </label>
              <input
                id="passwordConfirm"
                type="password"
                className="form-input"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="form-error">{error}</p>}
            {info && <p className="form-info">{info}</p>}

            <button type="submit" className="btn btn-primary btn-block btn-large" disabled={loading}>
              {loading ? "Please wait..." : "Save password"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
