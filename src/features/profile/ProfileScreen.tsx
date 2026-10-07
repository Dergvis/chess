import { useState, useEffect } from 'react';
import type { PlayerProgress, PlayerHero, MatchRecord } from '../../shared/types/progress';
import { getPlayerProgress } from '../../shared/storage/playerProgressStorage';
import { syncPlayerProgressFromServer } from '../../shared/lib/playerProgressApi';
import { getPlayerHero, getEvolutionStage, getEvolutionEmoji, getEvolutionDescription, getHeroPhrase } from '../../entities/character/playerHeroes';
import { initAchievements, updateAchievementsProgress, getRarityColor, getRarityName } from '../../entities/character/achievements';
import { getDailyMissions, claimMissionReward, getCompletedMissionsCount } from '../../entities/character/dailyMissions';
import type { Achievement, DailyMission } from '../../shared/types/progress';
import './ProfileScreen.css';

interface ProfileScreenProps {
  onBack: () => void;
  onPlay: () => void;
  onChooseHero: () => void;
}

export default function ProfileScreen({ onBack, onPlay, onChooseHero }: ProfileScreenProps) {
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [hero, setHero] = useState<PlayerHero | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'achievements' | 'missions' | 'history'>('profile');
  const [heroPhrase, setHeroPhrase] = useState('');
  const [achievements, setAchievements] = useState<Record<string, Achievement>>({});
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [claimedMission, setClaimedMission] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async () => {
      try {
        await syncPlayerProgressFromServer();
      } catch (error) {
        console.warn('[Progress] Profile sync failed:', error);
      }

      if (cancelled) return;

      const p = getPlayerProgress();
    setProgress(p);

    if (p.selectedHero) {
      const h = getPlayerHero(p.selectedHero);
      if (h) {
        const stage = getEvolutionStage(p.level.level);
        h.evolutionStage = stage;
        setHero(h);
        setHeroPhrase(getHeroPhrase(p.selectedHero, 'idle') || "Hi! Let’s play!");
      }
    }

    // Инициализируем достижения
    if (p.achievements && Object.keys(p.achievements).length > 0) {
      setAchievements(p.achievements);
    } else {
      const init = initAchievements();
      const { achievements: updated } = updateAchievementsProgress(init, p.stats);
      setAchievements(updated);
    }

    // Загружаем задания
    const missionsState = getDailyMissions();
      setMissions(missionsState.missions);
    };

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, []);

  // Обновляем фразу героя каждые 10 секунд
  useEffect(() => {
    if (!progress?.selectedHero) return;
    const interval = setInterval(() => {
      const events: Array<'win' | 'lose' | 'draw' | 'winStreak' | 'checkmate'> =
        ['win', 'draw', 'winStreak', 'checkmate'];
      const event = events[Math.floor(Math.random() * events.length)];
      setHeroPhrase(getHeroPhrase(progress.selectedHero!, event));
    }, 10000);
    return () => clearInterval(interval);
  }, [progress?.selectedHero]);

  const handleClaimMission = (missionId: string) => {
    const reward = claimMissionReward(missionId);
    if (reward) {
      setClaimedMission(missionId);
      // Обновляем прогресс
      setProgress(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currencies: {
            ...prev.currencies,
            xp: prev.currencies.xp + reward.xp,
            crystals: prev.currencies.crystals + reward.crystals,
          },
        };
      });
    }
  };

  if (!progress) {
    return <div className="profile-screen loading">Loading...</div>;
  }

  if (!hero) {
    return (
      <div className="profile-screen loading profile-empty">
        <div className="profile-empty-card">
          <h2>Choose a hero</h2>
          <p>After choosing a hero, you will see statistics, achievements and game history here.</p>
          <button className="btn-profile-play" onClick={onChooseHero}>
            Choose a hero
          </button>
        </div>
      </div>
    );
  }

  const winRate = progress.stats.totalGamesPlayed > 0
    ? Math.round((progress.stats.wins / progress.stats.totalGamesPlayed) * 100)
    : 0;

  const xpPercent = progress.level.xpToNextLevel > 0
    ? Math.round((progress.level.xp / (progress.level.xp + progress.level.xpToNextLevel)) * 100)
    : 100;

  const unlockedAchievements = Object.values(achievements).filter(a => a.unlocked).length;
  const totalAchievements = Object.values(achievements).length;

  return (
    <div className="profile-screen">
      <div className="profile-bg" />

      {/* Верхняя панель */}
      <header className="profile-header">
        <button className="btn-back-profile" onClick={onBack}>← Back</button>
        <div className="profile-top-bar">
          <div className="profile-user-info">
            <div className="profile-avatar" style={{ background: hero.color }}>
              {hero.avatar.startsWith('/') ? (
                <img src={hero.avatar} alt={hero.name} className="profile-avatar-img" />
              ) : (
                hero.avatar
              )}
            </div>
            <div className="profile-name-level">
              <span className="profile-name">{hero.name}</span>
              <span className="profile-level-badge">Lv. {progress.level.level}</span>
            </div>
          </div>
          <div className="profile-currencies">
            <div className="currency xp-currency">
              <span className="currency-icon">⭐</span>
              <span className="currency-value">{progress.currencies.xp}</span>
            </div>
            <div className="currency crystal-currency">
              <span className="currency-icon">💎</span>
              <span className="currency-value">{progress.currencies.crystals}</span>
            </div>
            <div className="currency trophy-currency">
              <span className="currency-icon">👑</span>
              <span className="currency-value">{progress.currencies.trophies}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Центральная зона героя */}
      <section className="hero-zone">
        <div className="hero-display">
          <div
            className="hero-character"
            style={{
              background: `radial-gradient(circle, ${hero.color}44 0%, transparent 70%)`,
            }}
          >
            {hero.avatar.startsWith('/') ? (
              <img src={hero.avatar} alt={hero.name} className="hero-big-avatar-img" />
            ) : (
              <div className="hero-big-avatar">{hero.avatar}</div>
            )}
            <div className="hero-stage-badge">
              {getEvolutionEmoji(hero.evolutionStage)}{' '}
              {getEvolutionDescription(hero.evolutionStage)}
            </div>
            <div className="hero-bubble">
              <p className="hero-speech">{heroPhrase}</p>
            </div>
          </div>
        </div>

        {/* Прогресс уровня */}
        <div className="level-progress-section">
          <div className="level-info">
            <span className="level-text">Level {progress.level.level}</span>
            <span className="xp-text">
              {progress.level.xpToNextLevel > 0
                ? `${progress.level.xp} / ${progress.level.xp + progress.level.xpToNextLevel} XP`
                : 'MAX'}
            </span>
          </div>
          <div className="xp-bar-bg">
            <div
              className="xp-bar-fill"
              style={{
                width: `${xpPercent}%`,
                background: `linear-gradient(90deg, ${hero.color}, ${hero.secondaryColor})`,
              }}
            />
          </div>
          {progress.level.level < 20 && (
            <p className="next-level-hint">
              {progress.level.xpToNextLevel} XP until the next evolution
            </p>
          )}
        </div>
      </section>

      {/* Табы */}
      <nav className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          📊 Statistics
        </button>
        <button
          className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏆 Achievements ({unlockedAchievements})
        </button>
        <button
          className={`tab-btn ${activeTab === 'missions' ? 'active' : ''}`}
          onClick={() => setActiveTab('missions')}
        >
          📋 Missions
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 History
        </button>
      </nav>

      {/* Контент табов */}
      <div className="profile-content">
        {activeTab === 'profile' && (
          <StatsTab stats={progress.stats} winRate={winRate} />
        )}
        {activeTab === 'achievements' && (
          <AchievementsTab achievements={achievements} />
        )}
        {activeTab === 'missions' && (
          <MissionsTab
            missions={missions}
            onClaim={handleClaimMission}
            claimed={claimedMission}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab history={progress.matchHistory} />
        )}
      </div>

      {/* Кнопка играть */}
      <div className="profile-play-section">
        <button className="btn-profile-play" onClick={onPlay}>
          🎮 Play!
        </button>
      </div>
    </div>
  );
}

/* ===== Компоненты табов ===== */

function StatsTab({ stats, winRate }: { stats: PlayerProgress['stats']; winRate: number }) {
  const favPiece = Object.entries(stats.favoritePiece).sort((a, b) => b[1] - a[1])[0];
  const pieceNames: Record<string, string> = {
    p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King",
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="stats-tab">
      <div className="stats-grid">
        <StatCard label="Wins" value={stats.wins} icon="🏆" color="#10B981" />
        <StatCard label="Losses" value={stats.losses} icon="😢" color="#EF4444" />
        <StatCard label="Draws" value={stats.draws} icon="🤝" color="#6B7280" />
        <StatCard label="Win rate" value={`${winRate}%`} icon="📈" color="#3B82F6" />
        <StatCard label="Winning streak" value={stats.winStreak} icon="🔥" color="#F59E0B" />
        <StatCard label="Best streak" value={stats.bestWinStreak} icon="⚡" color="#8B5CF6" />
        <StatCard label="Checkmates" value={stats.checkmatesDealt} icon="♟️" color="#EC4899" />
        <StatCard label="Games" value={stats.totalGamesPlayed} icon="🎮" color="#6366F1" />
        {favPiece && (
          <StatCard
            label="Favourite piece"
            value={pieceNames[favPiece[0]] || favPiece[0]}
            icon="⭐"
            color="#14B8A6"
          />
        )}
        <StatCard
          label="Time played"
          value={formatTime(stats.totalTimePlayedSeconds)}
          icon="⏱️"
          color="#A855F7"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}22` }}>{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function AchievementsTab({ achievements }: { achievements: Record<string, Achievement> }) {
  const sorted = Object.values(achievements).sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  return (
    <div className="achievements-tab">
      <div className="achievements-grid">
        {sorted.map(ach => (
          <div
            key={ach.id}
            className={`achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`}
            style={{
              borderColor: getRarityColor(ach.rarity),
              opacity: ach.unlocked ? 1 : 0.6,
            }}
          >
            <div className="ach-header">
              <span className="ach-icon">{ach.icon}</span>
              <span
                className="ach-rarity"
                style={{ color: getRarityColor(ach.rarity) }}
              >
                {getRarityName(ach.rarity)}
              </span>
            </div>
            <h4 className="ach-title">{ach.title}</h4>
            <p className="ach-desc">{ach.description}</p>
            <div className="ach-progress">
              <div className="ach-progress-bg">
                <div
                  className="ach-progress-fill"
                  style={{
                    width: `${Math.min(100, (ach.progress / ach.maxProgress) * 100)}%`,
                    background: getRarityColor(ach.rarity),
                  }}
                />
              </div>
              <span className="ach-progress-text">
                {ach.progress}/{ach.maxProgress}
              </span>
            </div>
            {ach.unlocked && (
              <div className="ach-rewards">
                <span>⭐ +{ach.xpReward} XP</span>
                <span>💎 +{ach.crystalReward}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionsTab({
  missions,
  onClaim,
  claimed,
}: {
  missions: DailyMission[];
  onClaim: (id: string) => void;
  claimed: string | null;
}) {
  return (
    <div className="missions-tab">
      <div className="missions-header">
        <h3>📋 Daily missions</h3>
        <span className="missions-count">
          {missions.filter(m => m.completed).length}/{missions.length} completed
        </span>
      </div>
      <div className="missions-list">
        {missions.map(mission => (
          <div
            key={mission.id}
            className={`mission-card ${mission.completed ? 'completed' : ''} ${claimed === mission.id ? 'claimed' : ''}`}
          >
            <div className="mission-icon">{mission.icon}</div>
            <div className="mission-info">
              <h4 className="mission-title">{mission.title}</h4>
              <p className="mission-desc">{mission.description}</p>
              <div className="mission-progress-bar">
                <div
                  className="mission-progress-fill"
                  style={{ width: `${(mission.progress / mission.maxProgress) * 100}%` }}
                />
              </div>
              <span className="mission-progress-text">
                {mission.progress}/{mission.maxProgress}
              </span>
            </div>
            <div className="mission-rewards">
              <span className="reward-xp">⭐ {mission.xpReward}</span>
              <span className="reward-crystals">💎 {mission.crystalReward}</span>
            </div>
            {mission.completed && !mission.claimed && (
              <button className="btn-claim" onClick={() => onClaim(mission.id)}>
                Collect!
              </button>
            )}
            {mission.claimed && (
              <span className="mission-claimed">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ history }: { history: MatchRecord[] }) {
  if (history.length === 0) {
    return (
      <div className="history-tab empty">
        <div className="history-empty">
          <span className="history-empty-icon">🎮</span>
          <p>You have not played a game yet!</p>
          <p className="history-empty-hint">Play your first game</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-tab">
      <div className="history-list">
        {history.map(match => (
          <div
            key={match.id}
            className={`history-card ${match.result === 'win' ? 'win' : match.result === 'lose' ? 'lose' : 'draw'}`}
          >
            <div className="history-result">
              {match.result === 'win' ? '🟢' : match.result === 'lose' ? '🔴' : '🟡'}
            </div>
            <div className="history-info">
              <span className="history-result-text">
                {match.result === 'win' ? "Win" : match.result === 'lose' ? "Defeat" : "Draw"}
              </span>
              <span className="history-opponent">
                Against: {match.opponentAvatar} {match.opponentName}
              </span>
              <span className="history-details">
                {match.moves} moves • {match.reason === 'checkmate' ? "Checkmate" : match.reason === 'stalemate' ? "Stalemate" : match.reason === 'resign' ? "Resignation" : "Draw"}
              </span>
            </div>
            <div className="history-xp">
              +{match.xpGained} XP
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
