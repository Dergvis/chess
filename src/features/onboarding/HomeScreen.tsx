import { useState, useEffect } from 'react';
import { getActiveSubscription, getDaysRemaining, getFormattedExpiryDate } from '../../shared/storage/subscriptionStorage';
import './HomeScreen.css';

interface HomeScreenProps {
  childName: string;
  onPlay: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

const GREETINGS = [
  "A lovely day for chess.",
  "The pieces are waiting for your move.",
  "Time for a good game.",
  "Every move is a chance to discover something.",
  "Let’s find the best move.",
  "The chessboard is ready.",
  "Try a clever plan today.",
  "Victories start with the first move.",
  "Ready for battle. The board awaits.",
  "Ready for a new game?",
];

export default function HomeScreen({ childName, onPlay, onProfile, onLogout }: HomeScreenProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const subscription = getActiveSubscription();
  const daysRemaining = getDaysRemaining();
  const expiryDate = getFormattedExpiryDate();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const todayKey = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const nameSeed = childName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    setGreetingIndex((todayKey + nameSeed) % GREETINGS.length);
  }, [childName]);

  const backgroundSrc = isMobile ? '/backgrounds/backgroundforallmobile.png' : '/backgrounds/backgroundforallweb.png';

  return (
    <div className="home-screen" data-page="3">
      <img
        src={backgroundSrc}
        alt="Home Background"
        className="home-background"
      />
      <div className="home-overlay" />
      <div className="home-container">
        <main className="home-main">
          <div className="home-menu">
            <div className="home-greeting">
              <div className="home-greeting-title">Hello, {childName || "Player"}!</div>
              <div className="home-greeting-text">{GREETINGS[greetingIndex]}</div>
            </div>

            {subscription.isActive && (
              <div className="home-subscription-status">
                Subscription active: {daysRemaining} days
                {expiryDate ? ` until ${expiryDate}` : ''}
              </div>
            )}

            <button className="home-menu-item btn btn-primary btn-large btn-play" onClick={onPlay}>
              <span className="menu-icon">🎮</span>
              <span className="menu-text">Play!</span>
            </button>
            <button className="home-menu-item btn btn-secondary btn-large btn-profile" onClick={onProfile}>
              <span className="menu-icon">⚔️</span>
              <span className="menu-text">My hero</span>
            </button>
            <button className="home-menu-item btn btn-logout-home btn-large" onClick={onLogout}>
              <span className="menu-icon">📤</span>
              <span className="menu-text">Sign out</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
