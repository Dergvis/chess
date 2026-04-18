import { useState } from 'react';
import { setPlayerName, completeOnboarding, updateSetting } from '../../shared/storage/settingsStorage';
import { getAllPieceSkins } from '../../entities/piece-skins/pieceSkins';
import './OnboardingScreen.css';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [selectedSkin, setSelectedSkin] = useState('block');

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Завершаем онбординг
      setPlayerName(name);
      updateSetting({ playerExperience: experience, pieceSkinId: selectedSkin });
      completeOnboarding();
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0;
    return true;
  };

  const pieceSkins = getAllPieceSkins();

  return (
    <div className="onboarding-screen">
      <div className="onboarding-container animate-fadeIn">
        <div className="onboarding-progress">
          <div className="onboarding-progress-bar" style={{ width: `${(step / 4) * 100}%` }} />
        </div>

        <div className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-step">
              <h1 className="onboarding-title">Привет! 👋</h1>
              <p className="onboarding-subtitle">Давай познакомимся!</p>
              
              <div className="onboarding-input-group">
                <label htmlFor="player-name">Как тебя называть?</label>
                <input
                  id="player-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Твоё имя"
                  maxLength={20}
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && canProceed() && handleNext()}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <h1 className="onboarding-title">Опыт игры 🎮</h1>
              <p className="onboarding-subtitle">Ты играл раньше в шахматы?</p>
              
              <div className="onboarding-options">
                <button
                  className={`onboarding-option ${experience === 'beginner' ? 'selected' : ''}`}
                  onClick={() => setExperience('beginner')}
                >
                  <span className="option-icon">🌱</span>
                  <span className="option-title">Нет, я новичок</span>
                  <span className="option-desc">Никогда не играл</span>
                </button>
                
                <button
                  className={`onboarding-option ${experience === 'intermediate' ? 'selected' : ''}`}
                  onClick={() => setExperience('intermediate')}
                >
                  <span className="option-icon">🌿</span>
                  <span className="option-title">Немного играл</span>
                  <span className="option-desc">Знаю правила</span>
                </button>
                
                <button
                  className={`onboarding-option ${experience === 'advanced' ? 'selected' : ''}`}
                  onClick={() => setExperience('advanced')}
                >
                  <span className="option-icon">🌳</span>
                  <span className="option-title">Хорошо играю</span>
                  <span className="option-desc">Опытный игрок</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <h1 className="onboarding-title">Выбор фигур ♟️</h1>
              <p className="onboarding-subtitle">Какие фигуры тебе нравятся?</p>
              
              <div className="onboarding-skins">
                {pieceSkins.map((skin) => (
                  <button
                    key={skin.id}
                    className={`onboarding-skin-card ${selectedSkin === skin.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSkin(skin.id)}
                  >
                    <div className="skin-preview">
                      <span className="skin-piece">♔</span>
                      <span className="skin-piece">♕</span>
                      <span className="skin-piece">♖</span>
                    </div>
                    <h3 className="skin-title">{skin.title}</h3>
                    <p className="skin-desc">{skin.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-step">
              <h1 className="onboarding-title">Всё готово! 🎉</h1>
              <p className="onboarding-subtitle">
                Привет, {name || 'друг'}! <br />
                Пора начинать игру!
              </p>
              
              <div className="onboarding-summary">
                <div className="summary-item">
                  <span className="summary-icon">🎮</span>
                  <span>Опыт: {experience === 'beginner' ? 'Новичок' : experience === 'intermediate' ? 'Средний' : 'Опытный'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">♟️</span>
                  <span>Фигуры: {pieceSkins.find(s => s.id === selectedSkin)?.title}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={handleBack}>
              Назад
            </button>
          )}
          
          <button 
            className="btn btn-primary btn-large" 
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {step === 4 ? 'Начать играть!' : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  );
}
