import { useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { getActiveSubscription, getDaysRemaining, getFormattedExpiryDate } from '../../shared/storage/subscriptionStorage';
import './PaymentSuccessScreen.css';

interface PaymentSuccessScreenProps {
  onNavigate?: NavigateFunction;
}

export default function PaymentSuccessScreen({ onNavigate }: PaymentSuccessScreenProps) {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);

  useEffect(() => {
    const sub = getActiveSubscription();
    if (sub.isActive) {
      setDaysRemaining(getDaysRemaining());
      setExpiryDate(getFormattedExpiryDate());
    }
  }, []);

  return (
    <div className="payment-success-screen">
      <div className="success-background" />
      <div className="success-overlay" />

      <div className="success-content">
        <div className="success-icon">🎉</div>
        <h1 className="success-title">Подписка активирована!</h1>
        <p className="success-subtitle">
          Ваша подписка Chezzies активирована
        </p>

        <div className="success-details">
          <div className="detail-row">
            <span className="detail-label">Действует до:</span>
            <span className="detail-value">{expiryDate || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Осталось дней:</span>
            <span className="detail-value">{daysRemaining}</span>
          </div>
        </div>

        <div className="success-features">
          <p className="features-title">Теперь вам доступны:</p>
          <div className="feature-list">
            <span className="feature-badge">♟ Все фигуры</span>
            <span className="feature-badge">🎬 Видео битвы</span>
            <span className="feature-badge">🏆 Все герои</span>
            <span className="feature-badge">⭐ Соперники разной силы</span>
          </div>
        </div>

        <button
          className="start-play-btn"
          onClick={() => onNavigate?.('/home')}
        >
          Start playing!
        </button>
      </div>
    </div>
  );
}
