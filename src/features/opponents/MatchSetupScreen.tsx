import { useState } from 'react';
import type { DifficultyLevel } from '../../shared/types';
import { getAllCharacters } from '../../entities/character/characters';
import { getAllPieceSkins } from '../../entities/piece-skins/pieceSkins';
import { getAllDifficultyPresets, getDifficultyPreset } from '../../shared/config/difficulty';
import './MatchSetupScreen.css';

interface MatchSetupScreenProps {
  onStartGame: (
    opponentId: string,
    difficulty: DifficultyLevel,
    pieceSkinId: string,
    playerColor: 'w' | 'b'
  ) => void;
  onBack: () => void;
  initialOpponent: string;
  initialDifficulty: DifficultyLevel;
  initialPieceSkin: string;
}

export default function MatchSetupScreen({
  onStartGame,
  onBack,
  initialOpponent,
  initialDifficulty,
  initialPieceSkin,
}: MatchSetupScreenProps) {
  const [selectedOpponent, setSelectedOpponent] = useState(initialOpponent);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [selectedPieceSkin, setSelectedPieceSkin] = useState(initialPieceSkin);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');

  const characters = getAllCharacters();
  const pieceSkins = getAllPieceSkins();
  const difficultyPresets = getAllDifficultyPresets();

  const handleStart = () => {
    onStartGame(selectedOpponent, selectedDifficulty, selectedPieceSkin, playerColor);
  };

  return (
    <div className="match-setup-screen">
      <div className="match-setup-container animate-fadeIn">
        <header className="match-setup-header">
          <button className="back-btn" onClick={onBack}>
            ← Назад
          </button>
          <h1 className="match-setup-title">Новая игра</h1>
        </header>

        <div className="match-setup-content">
          {/* Выбор соперника */}
          <section className="setup-section">
            <h2 className="setup-section-title">🦁 Выбери соперника</h2>
            <div className="opponents-grid">
              {characters.map((character) => (
                <button
                  key={character.id}
                  className={`opponent-card ${selectedOpponent === character.id ? 'selected' : ''}`}
                  onClick={() => setSelectedOpponent(character.id)}
                >
                  <span className="opponent-avatar">{character.avatar}</span>
                  <h3 className="opponent-name">{character.name}</h3>
                  <p className="opponent-difficulty">
                    {(() => {
                      const preset = getDifficultyPreset(character.difficultyPreset);
                      return preset?.subtitle || preset?.displayName || 'Средний';
                    })()}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Выбор сложности */}
          <section className="setup-section">
            <h2 className="setup-section-title">📊 Уровень сложности</h2>
            <div className="difficulty-options">
              {difficultyPresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`difficulty-option ${selectedDifficulty === preset.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDifficulty(preset.id)}
                >
                  <h3 className="difficulty-name">{preset.displayName}</h3>
                  <p className="difficulty-desc">{preset.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Выбор фигур */}
          <section className="setup-section">
            <h2 className="setup-section-title">♟️ Стиль фигур</h2>
            <div className="piece-skins-options">
              {pieceSkins.map((skin) => (
                <button
                  key={skin.id}
                  className={`piece-skin-option ${selectedPieceSkin === skin.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPieceSkin(skin.id)}
                >
                  <div className="skin-preview-large">
                    <span className="preview-piece">♔</span>
                    <span className="preview-piece">♕</span>
                    <span className="preview-piece">♖</span>
                    <span className="preview-piece">♗</span>
                    <span className="preview-piece">♘</span>
                    <span className="preview-piece">♙</span>
                  </div>
                  <h3 className="skin-option-title">{skin.title}</h3>
                  <p className="skin-option-desc">{skin.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Выбор цвета */}
          <section className="setup-section">
            <h2 className="setup-section-title">🎨 Твой цвет</h2>
            <div className="color-options">
              <button
                className={`color-option ${playerColor === 'w' ? 'selected' : ''}`}
                onClick={() => setPlayerColor('w')}
              >
                <span className="color-preview color-white">♔</span>
                <span className="color-name">Белые</span>
              </button>
              <button
                className={`color-option ${playerColor === 'b' ? 'selected' : ''}`}
                onClick={() => setPlayerColor('b')}
              >
                <span className="color-preview color-black">♚</span>
                <span className="color-name">Чёрные</span>
              </button>
            </div>
          </section>
        </div>

        <footer className="match-setup-footer">
          <button className="btn btn-primary btn-large start-game-btn" onClick={handleStart}>
            🚀 Начать игру!
          </button>
        </footer>
      </div>
    </div>
  );
}
