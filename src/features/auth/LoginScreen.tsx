import {PAYMENTS_ENABLED} from '../../product';
import { redeemPromoCode } from '../../shared/lib/sbpBilling';
import { syncSubscriptionFromServer } from '../../shared/storage/subscriptionStorage';
import type { AuthUser } from '../../shared/lib/authApi';
import {emit} from "../../world/events";
import { useState, useEffect } from 'react';
import { loginUser, registerUser, requestPasswordReset } from '../../shared/lib/authApi';
import './LoginScreen.css';

interface LoginScreenProps {
  onLogin: (email: string, childName: string) => void | Promise<void>;
}

type AuthMode = 'login' | 'register' | 'forgot';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>(()=>sessionStorage.getItem('chezzies-save-guest')?'register':'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [childName, setChildName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [registered, setRegistered] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const backgroundSrc = isMobile ? '/backgrounds/mobilebackground.png' : '/backgrounds/webbackground.png';

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === 'register') emit('registration_started');
    setMode(nextMode);
    setError('');
    setInfo('');
    setPassword('');
    setPasswordConfirm('');
  };

  const completeLogin = async (user: AuthUser) => {
    if (PAYMENTS_ENABLED && mode === 'register') sessionStorage.setItem('chezzies-premium-intent', 'registration');
    await onLogin(user.email, user.childName);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setInfo('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter an email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }

    if (mode === 'forgot') {
  
    setLoading(true);
      try {
        await requestPasswordReset(normalizedEmail);
        setInfo("If the account exists, we have sent a password reset link.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send the email");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setError("Use at least 6 characters for your password");
      return;
    }

    if (mode === 'register' && !childName.trim()) {
      setError("Enter your child’s name");
      return;
    }

    if (mode === 'register' && password !== passwordConfirm) {
      setError("The passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if(mode==='register')sessionStorage.setItem('chezzies-save-guest','1');
      const user = registered || (mode === 'register'
        ? await registerUser(normalizedEmail, password, childName.trim())
        : await loginUser(normalizedEmail, password));

      if(mode==='register') {
        if (!registered) { setRegistered(user); emit('registration_completed'); }
        if (PAYMENTS_ENABLED && promoCode.trim()) {
          try {
            const result = await redeemPromoCode(user.email, user.id, promoCode.trim().toUpperCase().replace(/\s+/g, ''));
            syncSubscriptionFromServer(result.expiresAt, 'promo');
          } catch (err) {
            setError("Account created. " + (err instanceof Error ? err.message : "Promo code not applied."));
            return;
          }
        }
      }
      await completeLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen" data-page="2">
      <img src={backgroundSrc} alt="Login Background" className="login-background" />
      <div className="login-overlay" />
      <div className="login-container animate-fadeIn">
        <header className="login-header">
          <h1 className="login-logo">
            <img src="/backgrounds/logo.png" alt="Chezzies" className="login-logo-img-large" />
          </h1>
          <p className="login-subtitle">A chess adventure for kids</p>
        </header>

        <main className="login-main">
          <div className="auth-tabs" hidden={!!registered}>
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              disabled={!!registered || loading}
              onClick={() => switchMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              disabled={!!registered || loading}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Parent’s email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                disabled={!!registered}
                placeholder="parent@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                disabled={!!registered}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            )}

            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="passwordConfirm">
                    Repeat password
                  </label>
                  <input
                    id="passwordConfirm"
                    type="password"
                    className="form-input"
                disabled={!!registered}
                    placeholder="Enter the same password again"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="childName">
                    Child’s name
                  </label>
                  <input
                    id="childName"
                    type="text"
                    className="form-input"
                disabled={!!registered}
                    placeholder="What is your young player’s name?"
                    value={childName}
                    onChange={(event) => setChildName(event.target.value)}
                    autoComplete="name"
                  />
                </div>
              </>
            )}

            {PAYMENTS_ENABLED && mode === 'register' && <div className="form-group">
              <label className="form-label" htmlFor="registration-promo">Promo code (optional)</label>
              <input id="registration-promo" className="form-input" value={promoCode} onChange={e => setPromoCode(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="Введите промокод" />
              <small>Code validity and access duration are checked by the server.</small>
            </div>}
            {PAYMENTS_ENABLED && registered && <button type="button" className="forgot-password-btn" disabled={loading} onClick={() => completeLogin(registered)}>Continue without a promo code</button>}
            {error && <p className="form-error">{error}</p>}
            {info && <p className="form-info">{info}</p>}

            <button type="submit" className="btn btn-primary btn-block btn-large" disabled={loading}>
              {loading
                ? "Please wait..."
                : registered ? "Continue" : mode === 'register'
                  ? "Create account"
                  : mode === 'forgot'
                    ? "Send link"
                    : "Sign in"}
            </button>
          </form>

          <button
            type="button"
            className="forgot-password-btn"
            disabled={!!registered || loading}
            onClick={() => switchMode(mode === 'forgot' ? 'login' : 'forgot')}
          >
            {mode === 'forgot' ? "Back to sign in" : "Forgot password?"}
          </button>
        </main>

        <footer className="login-footer">
          <p className="login-footer-text">
            Your account is saved on the server. Passwords are stored as secure hashes.
          </p>
        </footer>
      </div>
    </div>
  );
}
