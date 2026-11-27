import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { startCheckout, pollPaymentStatus } from '../../shared/lib/sbpBilling';
import { activateSubscription } from '../../shared/storage/subscriptionStorage';
import { getAuth } from '../../shared/storage/authStorage';
import './PaymentScreen.css';

export default function PaymentScreen() {
  const navigate = useNavigate();
  const [qrImage, setQrImage] = useState<string>('');
  const [qrcId, setQrcId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(1800); // 30 минут в секундах
  const pollRef = useRef<number | null>(null);

  // Генерация QR из payload
  const generateQR = async (payload: string) => {
    try {
      const qr = await QRCode.toDataURL(payload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0145a5',
          light: '#ffffff',
        },
      });
      setQrImage(qr);
    } catch (e) {
      console.error('[Payment] QR generation error:', e);
      setError('Ошибка генерации QR-кода');
    }
  };

  // Создание платежа
  useEffect(() => {
    const createPayment = async () => {
      try {
        setLoading(true);
        setError('');

        // Получаем userId и email из localStorage или генерируем
        const auth = getAuth();
        const userId = auth.userId || auth.email || localStorage.getItem('userId') || `user_${Date.now()}`;
        const email = auth.email || localStorage.getItem('userEmail') || `user_${Date.now()}@chezzies.ru`;

        // Сохраняем для будущего использования
        if (!localStorage.getItem('userId')) {
          localStorage.setItem('userId', userId);
        }
        if (!localStorage.getItem('userEmail')) {
          localStorage.setItem('userEmail', email);
        }

        const result = await startCheckout(userId, email);

        if (result.qrPayload) {
          setQrcId(result.qrcId || '');
          await generateQR(result.qrPayload);

          // Запускаем поллинг статуса каждые 3 секунды
          if (result.qrcId) {
            pollRef.current = window.setInterval(async () => {
              try {
                const statusResult = await pollPaymentStatus(result.qrcId!);
                if (statusResult.status === 'Executed') {
                  // Оплата прошла!
                  activateSubscription(false, statusResult.expiresAt || null);
                  if (pollRef.current) clearInterval(pollRef.current);
                  navigate('/payment-success');
                }
              } catch (e) {
                console.error('[Payment] Poll error:', e);
              }
            }, 3000);
          }
        } else {
          // Mock режим — сразу активируется
          navigate('/payment-success');
        }
      } catch (e: any) {
        console.error('[Payment] Create error:', e);
        setError(e.message || 'Ошибка создания платежа');
      } finally {
        setLoading(false);
      }
    };

    createPayment();

    // Cleanup
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [navigate]);

  // Таймер обратного отсчёта
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Время жизни QR-кода истекло. Обновите страницу.');
          if (pollRef.current) clearInterval(pollRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="payment-screen">
        <div className="payment-loading">
          <div className="spinner" />
          <p>Создаём QR-код для оплаты...</p>
        </div>
      </div>
    );
  }

  if (error && !qrImage) {
    return (
      <div className="payment-screen">
        <div className="payment-error">
          <div className="error-icon">❌</div>
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button className="back-btn" onClick={() => navigate('/subscribe')}>
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-screen">
      <div className="payment-background" />
      <div className="payment-overlay" />

      <div className="payment-content">
        <button className="close-btn" onClick={() => navigate('/subscribe')}>
          ✕
        </button>

        <div className="payment-header">
          <h1 className="payment-title">Оплата через СБП</h1>
          <p className="payment-subtitle">
            Отсканируйте QR-код через приложение банка
          </p>
        </div>

        <div className="payment-amount">
          <span className="amount-label">Сумма:</span>
          <span className="amount-value">299 ₽</span>
        </div>

        <div className="qr-container">
          {qrImage ? (
            <img src={qrImage} alt="QR-код для оплаты" className="qr-image" />
          ) : (
            <div className="qr-loading">
              <div className="spinner small" />
            </div>
          )}
          <div className="qr-timer">
            <span className="timer-icon">⏱</span>
            <span className="timer-value">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="payment-instructions">
          <div className="instruction-step">
            <span className="step-number">1</span>
            <span className="step-text">Откройте приложение банка</span>
          </div>
          <div className="instruction-step">
            <span className="step-number">2</span>
            <span className="step-text">Выберите «Оплата по QR» или «СБП»</span>
          </div>
          <div className="instruction-step">
            <span className="step-number">3</span>
            <span className="step-text">Наведите камеру на QR-код</span>
          </div>
          <div className="instruction-step">
            <span className="step-number">4</span>
            <span className="step-text">Подтвердите оплату</span>
          </div>
        </div>

        <div className="payment-status">
          <div className="status-indicator waiting">
            <span className="status-dot" />
            <span className="status-text">Ожидание оплаты...</span>
          </div>
        </div>

        <p className="payment-note">
          QR-код действителен 30 минут. После оплаты подписка активируется автоматически.
        </p>
      </div>
    </div>
  );
}
