import { useState, useEffect, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import QRCode from 'qrcode';
import { startCheckout, pollPaymentStatus, redeemPromoCode } from '../../shared/lib/sbpBilling';
import { getAuth } from '../../shared/storage/authStorage';
import { activateSubscription, syncSubscriptionFromServer } from '../../shared/storage/subscriptionStorage';
import { getCurrentUser } from '../../shared/lib/authApi';
import './SubscribeScreen.css';

interface SubscribeScreenProps {
  onNavigate?: NavigateFunction;
}

const BILLING_MODE = (((import.meta as any).env?.VITE_BILLING_MODE as string) || 'mock') as 'mock' | 'sbp';

export default function SubscribeScreen({ onNavigate }: SubscribeScreenProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrcId, setQrcId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'processing' | 'success'>('waiting');
  const [timeLeft, setTimeLeft] = useState(1800); // 30 минут
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // В mock-режиме — сразу активируем и редиректим
  useEffect(() => {
    if (BILLING_MODE === 'mock') {
      handleMockPayment();
    }
  }, []);

  // Таймер обратного отсчёта
  useEffect(() => {
    if (!qrcId || BILLING_MODE === 'mock') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Время QR-кода истекло. Создайте новый.');
          setQrCode(null); setQrImage(null); setQrcId(null);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrcId]);

  // Поллинг статуса платежа в production
  useEffect(() => {
    if (!qrcId || BILLING_MODE === 'mock') return;

    let active = true, checking = false;
    pollIntervalRef.current = setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        const result = await pollPaymentStatus(qrcId);
        if (!active) return;
        if (result.status === 'Executed') {
          activateSubscription(false, result.expiresAt || null);
          setPaymentStatus('success');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            if (active) onNavigate?.('/payment-success');
          }, 1500);
        } else if (result.status === 'Accepted') {
          setPaymentStatus('processing');
        } else if (result.status === 'Rejected') {
          setError('Платёж отклонён. Можно создать новый QR-код.');
          setQrCode(null); setQrImage(null); setQrcId(null);
        }
      } catch (err) {
        console.error('Poll error:', err);
      } finally { checking = false; }
    }, 3000);

    return () => {
      active = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [qrcId, onNavigate]);

  const handleMockPayment = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const userId = auth.userId || auth.email || 'guest';
      const email = auth.email || '';

      await startCheckout(userId, email);
      onNavigate?.('/payment-success');
    } catch (err) {
      setError('Ошибка активации подписки');
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);
    setPaymentStatus('waiting');
    setTimeLeft(1800);

    try {
      let auth = getAuth();
      if (!auth.email) {
        const serverUser = await getCurrentUser().catch(() => null);
        if (serverUser) auth = getAuth();
      }

      const email = auth.email.trim();
      if (!email) {
        setError('Чтобы оплатить подписку, сначала войдите или зарегистрируйтесь.');
        setTimeout(() => onNavigate?.('/login'), 1200);
        return;
      }

      const userId = auth.userId || email;

      const result = await startCheckout(userId, email);

      if (result.qrPayload && result.qrcId) {
        setQrCode(result.qrPayload);
        setQrcId(result.qrcId);
        if (result.expiresAt) { const seconds = Math.floor((Date.parse(result.expiresAt) - Date.now()) / 1000); if (Number.isFinite(seconds)) setTimeLeft(Math.max(1, seconds)); }

        // Генерируем QR-код на клиенте из payload (ссылка qr.nspk.ru)
        const qrDataUrl = await QRCode.toDataURL(result.qrPayload, {
          width: 300,
          margin: 2,
          color: {
            dark: '#0145a5',
            light: '#ffffff',
          },
        });
        setQrImage(qrDataUrl);
      } else {
        setError('Не удалось создать платёж. Попробуйте снова.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка создания платежа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };


  const handleRedeemPromo = async () => {
    const normalizedCode = promoCode.trim().toUpperCase().replace(/\s+/g, '');

    if (!normalizedCode) {
      setPromoError('Введите промокод');
      return;
    }

    setPromoLoading(true);
    setPromoError(null);
    setError(null);

    try {
      let auth = getAuth();
      if (!auth.email) {
        const serverUser = await getCurrentUser().catch(() => null);
        if (serverUser) auth = getAuth();
      }

      const email = auth.email.trim();
      if (!email) {
        setPromoError('Чтобы применить промокод, сначала войдите или зарегистрируйтесь.');
        setTimeout(() => onNavigate?.('/login'), 1200);
        return;
      }

      const result = await redeemPromoCode(email, auth.userId || email, normalizedCode);
      syncSubscriptionFromServer(result.expiresAt, "promo");
      setPaymentStatus('success');
      onNavigate?.('/payment-success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Промокод не сработал';
      setPromoError(message);
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className="subscribe-screen">
      <div className="subscribe-background" />
      <div className="subscribe-overlay" />

      <div className="subscribe-content">
        <div className="subscribe-header">
          <button className="back-btn" onClick={() => onNavigate?.(getAuth().isLoggedIn ? '/account' : '/')}>
            ← Back
          </button>
          <h1 className="subscribe-title">Подписка Chezzies</h1>
        </div>

        <div className="subscribe-card">
          <div className="price-section">
            <span className="price-label">Стоимость:</span>
            <span className="price-value">299 ₽</span>
            <span className="price-period">/ месяц</span>
          </div>

          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">♟</span>
              <span>Все фигуры с анимациями взятия</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎬</span>
              <span>Комедийные видео битвы</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🏆</span>
              <span>Все герои и персонажи</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⭐</span>
              <span>10 уровней сложности ИИ</span>
            </div>
          </div>


            <div className="promo-code-panel">
              <label className="promo-code-label" htmlFor="promo-code-input">
                Есть промокод?
              </label>
              <div className="promo-code-row">
                <input
                  id="promo-code-input"
                  className="promo-code-input"
                  type="text"
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  placeholder="Укажите промокод"
                  autoComplete="off"
                  disabled={promoLoading || loading}
                />
                <button
                  className="promo-code-button"
                  type="button"
                  onClick={handleRedeemPromo}
                  disabled={promoLoading || loading}
                >
                  {promoLoading ? 'Проверяем...' : 'Применить'}
                </button>
              </div>
              {promoError && <div className="promo-code-error">{promoError}</div>}
            </div>

          {!qrCode ? (
            <button
              className="pay-btn"
              onClick={handleCreatePayment}
              disabled={loading || promoLoading}
            >
              {loading ? 'Создаём платёж...' : 'Оплатить через СБП — 299 ₽'}
            </button>
          ) : (
            <div className="qr-section">
              <p className="qr-instruction">
                Отсканируйте QR-код через приложение банка:
              </p>

              <div className="qr-container">
                {qrImage && (
                  <img
                    src={qrImage}
                    alt="QR-код для оплаты"
                    className="qr-image"
                  />
                )}
                <div className="qr-timer">
                  <span className="timer-icon">⏱</span>
                  <span className="timer-value">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              <a
                className="sbp-pay-link"
                href={qrCode}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть оплату в банке
              </a>

              <p className="sbp-pay-hint">
                На телефоне ссылка откроет выбор банка или приложение банка, если оно поддерживает оплату по СБП.
              </p>

              <div className="qr-steps">
                <div className="step">
                  <span className="step-num">1</span>
                  <span>Откройте приложение банка</span>
                </div>
                <div className="step">
                  <span className="step-num">2</span>
                  <span>Выберите «Оплата по QR» или «СБП»</span>
                </div>
                <div className="step">
                  <span className="step-num">3</span>
                  <span>Наведите камеру на QR-код</span>
                </div>
                <div className="step">
                  <span className="step-num">4</span>
                  <span>Подтвердите оплату</span>
                </div>
              </div>

              <div className={`payment-status ${paymentStatus}`}>
                {paymentStatus === 'waiting' && (
                  <div className="status-waiting">
                    <span className="status-dot" />
                    Ожидание оплаты...
                  </div>
                )}
                {paymentStatus === 'processing' && (
                  <div className="status-processing">
                    <span className="status-dot spinning" />
                    Платёж обрабатывается...
                  </div>
                )}
                {paymentStatus === 'success' && (
                  <div className="status-success">
                    ✓ Оплата прошла! Перенаправляем...
                  </div>
                )}
              </div>
            </div>
          )}

          {!qrcId && <button type="button" className="forgot-password-btn" disabled={loading || promoLoading} onClick={() => onNavigate?.("/home")}>Продолжить бесплатно</button>}
          {error && <div className="error-message">{error}</div>}

          <p className="subscription-note">
            Подписка действует 30 дней. После окончания снова доступны только пешки.
          </p>
        </div>
      </div>
    </div>
  );
}
