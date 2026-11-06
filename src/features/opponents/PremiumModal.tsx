import { useNavigate } from 'react-router-dom';
import './PremiumModal.css';

interface PremiumModalProps {
  onClose: () => void;
}

export default function PremiumModal({ onClose }: PremiumModalProps) {
  const navigate = useNavigate();

  const handleWantHero = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal-content" onClick={e => e.stopPropagation()}>
        <button className="premium-modal-close" onClick={onClose}>✕</button>
        <div className="premium-modal-icon"></div>
        <h2 className="premium-modal-title">Только в платной версии</h2>
        <p className="premium-modal-text">
          Этот персонаж доступен в полной версии игры.<br />
          Разблокируй всех героев и получи доступ к эксклюзивному контенту!
        </p>
        <button className="premium-modal-btn" onClick={handleWantHero}>
          Хочу такого героя
        </button>
      </div>
    </div>
  );
}
