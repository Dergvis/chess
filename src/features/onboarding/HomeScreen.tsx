import './HomeScreen.css';

interface HomeScreenProps {
  onPlay: () => void;
  onSettings: () => void;
}

export default function HomeScreen({ onPlay, onSettings }: HomeScreenProps) {
  return (
    <div className="home-screen">
      <div className="home-container animate-fadeIn">
        <header className="home-header">
          <h1 className="home-title">
            <span className="title-icon">♔</span>
            Шахматы для Гоши
          </h1>
          <p className="home-subtitle">Увлекательные шахматы для детей</p>
        </header>

        <main className="home-main">
          <div className="home-menu">
            <button className="home-menu-item btn btn-primary btn-large" onClick={onPlay}>
              <span className="menu-icon">🎮</span>
              <span className="menu-text">Играть</span>
            </button>

            <button className="home-menu-item btn btn-secondary btn-large" onClick={onSettings}>
              <span className="menu-icon">⚙️</span>
              <span className="menu-text">Настройки</span>
            </button>

            <div className="home-menu-item home-menu-item-disabled btn btn-large">
              <span className="menu-icon">📚</span>
              <span className="menu-text">Учиться</span>
              <span className="menu-badge">Скоро</span>
            </div>

            <div className="home-menu-item home-menu-item-disabled btn btn-large">
              <span className="menu-icon">🏆</span>
              <span className="menu-text">Награды</span>
              <span className="menu-badge">Скоро</span>
            </div>
          </div>
        </main>

        <footer className="home-footer">
          <p className="home-footer-text">
            Приятной игры! 😊
          </p>
        </footer>
      </div>
    </div>
  );
}
