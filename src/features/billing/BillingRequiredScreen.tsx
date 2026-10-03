import type { NavigateFunction } from 'react-router-dom';
import './BillingRequiredScreen.css';

interface BillingRequiredScreenProps {
  onNavigate?: NavigateFunction;
}

export default function BillingRequiredScreen({ onNavigate }: BillingRequiredScreenProps) {
  return (
    <div className="billing-required-screen">
      <div className="billing-background" />
      <div className="billing-overlay" />

      <div className="billing-content">
        <div className="billing-icon">🔒</div>
        <h1 className="billing-title">Подписка истекла</h1>
        <p className="billing-description">
          Срок вашей подписки истёк. Сейчас вам доступны только пешки.
          Продлите подписку, чтобы разблокировать все фигуры и анимации!
        </p>

        <div className="billing-preview">
          <div className="preview-item preview-locked">
            <span className="preview-icon">♟</span>
            <span className="preview-label">Пешки</span>
            <span className="preview-status available">Доступно</span>
          </div>
          <div className="preview-item preview-locked">
            <span className="preview-icon">♞</span>
            <span className="preview-label">Knight</span>
            <span className="preview-status locked">🔒 Заблокировано</span>
          </div>
          <div className="preview-item preview-locked">
            <span className="preview-icon">♝</span>
            <span className="preview-label">Bishop</span>
            <span className="preview-status locked">🔒 Заблокировано</span>
          </div>
          <div className="preview-item preview-locked">
            <span className="preview-icon">♜</span>
            <span className="preview-label">Rook</span>
            <span className="preview-status locked">🔒 Заблокировано</span>
          </div>
          <div className="preview-item preview-locked">
            <span className="preview-icon">♛</span>
            <span className="preview-label">Queen</span>
            <span className="preview-status locked">🔒 Заблокировано</span>
          </div>
          <div className="preview-item preview-locked">
            <span className="preview-icon">♚</span>
            <span className="preview-label">King</span>
            <span className="preview-status locked">🔒 Заблокировано</span>
          </div>
        </div>

        <div className="billing-actions">
          <button
            className="subscribe-btn"
            onClick={() => onNavigate?.('/subscribe')}
          >
            Продлить подписку — 299 ₽/мес
          </button>
          <button
            className="pay-sbp-btn"
            onClick={() => onNavigate?.('/payment')}
          >
            Оплатить сейчас через СБП
          </button>
          <button
            className="play-free-btn"
            onClick={() => onNavigate?.('/home')}
          >
            Играть с пешками
          </button>
        </div>

        <p className="billing-note">
          Подписка на 30 дней. Отмена в любой момент.
        </p>
      </div>
    </div>
  );
}
