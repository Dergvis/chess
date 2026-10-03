import {PAYMENTS_ENABLED} from '../product';
import MobileGameShell, {openMobileDestination} from '../world/mobile/MobileGameShell';
import {worldKey} from "../world/accountStorage";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { ChessCore } from '../entities/chess/ChessCore';
import { AIAdapter } from '../features/game/AIAdapter';
import { AnimationEventSystem } from '../entities/animation/AnimationEventSystem';
import type { Color, Move, DifficultyLevel, GameState, GameResult, AppState } from '../shared/types';
import { getCharacter } from '../entities/character/characters';
import { getPieceSkin } from '../entities/piece-skins/pieceSkins';
import { getDifficultyPreset } from '../shared/config/difficulty';
import { getSettings, updateSetting } from '../shared/storage/settingsStorage';
import { getAuth, loginWithEmail, logout, getChildName } from '../shared/storage/authStorage';
import { getPlayerProgress, awardMatchXp, recordMatchResult, updateTrophies, updateProgress, selectHero } from '../shared/storage/playerProgressStorage';
import { updateAchievementsProgress, initAchievements } from '../entities/character/achievements';
import { updateMissionProgress } from '../entities/character/dailyMissions';
import { clearSubscription, getActiveSubscription, syncSubscriptionFromServer } from '../shared/storage/subscriptionStorage';
import { clearActiveGameSnapshot, getActiveGameSnapshot, saveActiveGameSnapshot } from '../shared/storage/activeGameStorage';
import { verifySubscription } from '../shared/lib/sbpBilling';
import { getCurrentUser, logoutUser } from '../shared/lib/authApi';
import { pushPlayerProgressToServer, syncPlayerProgressFromServer } from '../shared/lib/playerProgressApi';
import SplashScreen from '../features/splash/SplashScreen';
import WorldApp from '../world/WorldApp';

import ProfileScreen from '../features/profile/ProfileScreen';
import MatchSetupScreen from '../features/opponents/MatchSetupScreen';
import GameScreen from '../features/game/GameScreen';
import ResultScreen from '../features/game/ResultScreen';
import LoginScreen from '../features/auth/LoginScreen';
import ResetPasswordScreen from '../features/auth/ResetPasswordScreen';
import SubscribeScreen from '../features/billing/SubscribeScreen';
import PaymentSuccessScreen from '../features/billing/PaymentSuccessScreen';
import BillingRequiredScreen from '../features/billing/BillingRequiredScreen';

import SupportChat from '../features/support/SupportChat';
import './App.css';

// РњР°РїРїРёРЅРі URL в†’ appState
const PATH_TO_STATE: Record<string, AppState> = {
  '/': 'splash',
  '/login': 'login',
  '/reset-password': 'reset_password',
  '/hero-select': 'hero_select',
  '/home': 'home',
  '/profile': 'profile',
  '/match': 'match_setup',
  '/game': 'game_ready',
  '/result': 'game_over',
  '/subscribe': 'subscribe',
  '/payment': 'payment',
  '/payment-success': 'payment_success',
  '/billing-required': 'billing_required',
  '/admin': 'admin',
};

export default function App() {
  const navigate = useNavigate();
  const rawLocation = useLocation();
  const location = {...rawLocation, pathname: rawLocation.pathname.replace(/\/$/, '') || '/'};
  const [chessCore] = useState(() => new ChessCore());
  const [aiAdapter, setAiAdapter] = useState<AIAdapter | null>(null);
  const [animationSystem] = useState(() => new AnimationEventSystem());

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [opponentId, setOpponentId] = useState<string>('bear');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('level_1');
  const [pieceSkinId, setPieceSkinId] = useState<string>('default');

  // РћРїСЂРµРґРµР»СЏРµРј appState РёР· URL
  const [appState, setAppState] = useState<AppState>(() => PATH_TO_STATE[location.pathname] || 'splash');

  // РЎРѕСЃС‚РѕСЏРЅРёРµ РїРѕРґРїРёСЃРєРё
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const recordedMatchKeyRef = useRef<string | null>(null);
  const currentMatchIdRef = useRef<string>('');
  const engineMoveTimerRef = useRef<number | null>(null);

  const clearEngineMoveTimer = useCallback(() => {
    if (engineMoveTimerRef.current !== null) {
      window.clearTimeout(engineMoveTimerRef.current);
      engineMoveTimerRef.current = null;
    }
  }, []);

  const finishGameFromState = useCallback((state: GameState, matchId: string) => {
    setGameResult({
      matchId,
      winner: chessCore.getWinner(),
      reason: state.isCheckmate ? 'checkmate' : state.isStalemate ? 'stalemate' : 'draw',
      moves: state.moves.length,
      duration: 0,
    });
    setAppState('game_over');
    navigate('/result');
  }, [chessCore, navigate]);

  const scheduleEngineMove = useCallback((ai: AIAdapter, delay: number, matchId: string) => {
    clearEngineMoveTimer();
    engineMoveTimerRef.current = window.setTimeout(async () => {
      const aiMove = await ai.getBestMove();
      if (aiMove) {
        const result = chessCore.makeMove(aiMove);

        if (result && result.animationHint) {
          animationSystem.emit({
            type: result.animationHint,
            payload: {
              from: result.from,
              to: result.to,
              piece: result.piece,
              capturedPiece: result.capturedPiece,
            },
            skippable: true,
          });
        }

        const newState = chessCore.getState();
        setGameState(newState);

        if (newState.isCheckmate || newState.isStalemate || newState.isDraw) {
          finishGameFromState(newState, matchId);
          return;
        }
      }

      setAppState('player_turn');
    }, delay);
  }, [animationSystem, chessCore, clearEngineMoveTimer, finishGameFromState]);

  const refreshSubscriptionFromServer = useCallback(async (email?: string): Promise<boolean> => {
    if (!PAYMENTS_ENABLED) { setHasSubscription(true); return true; }
    const auth = getAuth();
    const normalizedEmail = (email || auth.email || localStorage.getItem('userEmail') || '').trim().toLowerCase();

    if (!normalizedEmail) {
      setHasSubscription(false);
      return false;
    }

    const result = await verifySubscription(normalizedEmail);

    if (result.hasSubscription) {
      syncSubscriptionFromServer(result.expiresAt,result.source);
      setHasSubscription(true);
      return true;
    }

    clearSubscription();
    setHasSubscription(false);
    return false;
  }, []);

  // РџСЂРѕРІРµСЂСЏРµРј РїРѕРґРїРёСЃРєСѓ РїСЂРё Р·Р°РіСЂСѓР·РєРµ (РґР»СЏ Р°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹С… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№)
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      let auth = getAuth();

      try {
        const serverUser = await getCurrentUser();
        if (!serverUser) { logout(); clearSubscription(); }
        auth = getAuth();
      } catch {
        // A temporary network failure must not erase a previously verified local profile.
        // An explicit expired/absent session is handled above.
        auth = getAuth();
      }

      if (cancelled) return;

      if (auth.isLoggedIn) {
        try {
          await syncPlayerProgressFromServer();
        } catch (error) {
          console.warn('[Progress] Sync on init failed:', error);
        }
        try {
          await refreshSubscriptionFromServer(auth.email);
        } catch (error) {
          console.warn('[Billing] Initial subscription check failed:', error);
          const localSub = getActiveSubscription();
          setHasSubscription(localSub.isActive);
        }
        setSubscriptionChecked(true);
      } else {
        setHasSubscription(false);
        setSubscriptionChecked(true);
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [refreshSubscriptionFromServer]);

  // РџРµСЂРёРѕРґРёС‡РµСЃРєРё РїСЂРѕРІРµСЂСЏРµРј СЃРµСЂРІРµСЂ (РІ production)
  useEffect(() => {
    if (!PAYMENTS_ENABLED || !subscriptionChecked) return;

    const interval = setInterval(async () => {
      const auth = getAuth();
      if (auth.isLoggedIn) {
        try {
          await refreshSubscriptionFromServer(auth.email);
        } catch {
          // Fallback РЅР° localStorage
          const localSub = getActiveSubscription();
          setHasSubscription(localSub.isActive);
        }
      }
    }, 60000); // РџСЂРѕРІРµСЂСЏРµРј РєР°Р¶РґСѓСЋ РјРёРЅСѓС‚Сѓ

    return () => clearInterval(interval);
  }, [subscriptionChecked, refreshSubscriptionFromServer]);

  // РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ URL в†’ appState
  useEffect(() => {
    const newState = !PAYMENTS_ENABLED && /subscribe|payment|billing/.test(location.pathname) ? 'home' : PATH_TO_STATE[location.pathname] || 'splash';
    console.log('[App] URL changed:', location.pathname, "→ newState:", newState);
    setAppState(newState);
  }, [location.pathname]);

  // РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ
  useEffect(() => {
    console.log('=== APP INIT ===');
    if (location.pathname === '/admin' || location.pathname === '/reset-password') {
      return;
    }

    const settings = getSettings();
    setOpponentId(settings.opponentId);
    setDifficulty(settings.difficulty);
    setPieceSkinId(settings.pieceSkinId);
    animationSystem.setIntensity(settings.animationIntensity);

    const routeState = PATH_TO_STATE[location.pathname];
    if (routeState && location.pathname !== '/') {
      setAppState(routeState);
      return;
    }

    // РџСЂРѕРІРµСЂСЏРµРј Р°РІС‚РѕСЂРёР·Р°С†РёСЋ Рё РІС‹Р±РѕСЂ РіРµСЂРѕСЏ
    const auth = getAuth();
    const progress = getPlayerProgress();

    // The root route always starts with the original opening video.

    return () => {
      chessCore.reset();
      clearEngineMoveTimer();
    };
  }, []);

  useEffect(() => {
    if (gameState || location.pathname !== '/game') return;

    const snapshot = getActiveGameSnapshot();
    if (!snapshot) return;

    chessCore.loadSnapshot(snapshot.fen, snapshot.moves, snapshot.capturedPieces);
    const restoredState = chessCore.getState();
    const aiColor: Color = snapshot.playerColor === 'w' ? 'b' : 'w';
    const ai = new AIAdapter(chessCore, snapshot.difficulty, aiColor);

    currentMatchIdRef.current = snapshot.matchId;
    recordedMatchKeyRef.current = null;
    setOpponentId(snapshot.opponentId);
    setDifficulty(snapshot.difficulty);
    setPieceSkinId(snapshot.pieceSkinId);
    setPlayerColor(snapshot.playerColor);
    setAiAdapter(ai);
    setGameState(restoredState);
    setSelectedSquare(null);
    setLegalMoves([]);

    if (restoredState.isCheckmate || restoredState.isStalemate || restoredState.isDraw) {
      finishGameFromState(restoredState, snapshot.matchId);
      return;
    }

    const restoredAppState = restoredState.turn === snapshot.playerColor ? 'player_turn' : 'engine_turn';
    setAppState(restoredAppState);
    navigate('/game', { replace: true });

    if (restoredAppState === 'engine_turn') {
      scheduleEngineMove(ai, 800, snapshot.matchId);
    }
  }, [appState, chessCore, finishGameFromState, gameState, navigate, scheduleEngineMove]);

  useEffect(() => {
    if (!gameState || !currentMatchIdRef.current) return;
    if (!['game_ready', 'player_turn', 'player_piece_selected', 'engine_turn', 'animation_playing'].includes(appState)) return;

    saveActiveGameSnapshot({
      fen: gameState.fen,
      moves: gameState.moves,
      capturedPieces: gameState.capturedPieces,
      playerColor,
      opponentId,
      difficulty,
      pieceSkinId,
      appState,
      matchId: currentMatchIdRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, [appState, difficulty, gameState, opponentId, pieceSkinId, playerColor]);

  useEffect(() => {
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive || !gameState || !currentMatchIdRef.current) return;

      saveActiveGameSnapshot({
        fen: gameState.fen,
        moves: gameState.moves,
        capturedPieces: gameState.capturedPieces,
        playerColor,
        opponentId,
        difficulty,
        pieceSkinId,
        appState,
        matchId: currentMatchIdRef.current,
        updatedAt: new Date().toISOString(),
      });
    });

    return () => {
      listener.then(handle => handle.remove());
    };
  }, [appState, difficulty, gameState, opponentId, pieceSkinId, playerColor]);

  // Р’С‹Р±РѕСЂ РіРµСЂРѕСЏ Р·Р°РІРµСЂС€С‘РЅ
  const handleHeroSelected = useCallback(async () => {
    console.log('[App] Hero selected, going to home');
    try {
      await pushPlayerProgressToServer();
    } catch (error) {
      console.warn('[Progress] Hero sync failed:', error);
    }
    setAppState('home');
    navigate('/home');
  }, [navigate]);

  // Р—Р°РїСѓСЃРє РёРіСЂС‹
  const startGame = useCallback((
    selectedOpponentId: string,
    selectedDifficulty: DifficultyLevel,
    selectedPieceSkinId: string,
    selectedPlayerColor: Color = 'w'
  ) => {
    console.log('=== START GAME ===');
    setOpponentId(selectedOpponentId);
    setDifficulty(selectedDifficulty);
    setPieceSkinId(selectedPieceSkinId);
    setPlayerColor(selectedPlayerColor);

    updateSetting({
      opponentId: selectedOpponentId,
      difficulty: selectedDifficulty,
      pieceSkinId: selectedPieceSkinId,
    });

    chessCore.reset();
    recordedMatchKeyRef.current = null;
    currentMatchIdRef.current = crypto.randomUUID();
    const initialState = chessCore.getState();
    setGameState(initialState);

    // Checkmate РІРёРґРµРѕ СѓР¶Рµ РїСЂРµРґР·Р°РіСЂСѓР¶РµРЅС‹ splash preloader'РѕРј
    // Battle РІРёРґРµРѕ lazy-loadСЏС‚СЃСЏ С‡РµСЂРµР· BattleAnimation РїРѕ С‚СЂРµР±РѕРІР°РЅРёСЋ

    const aiColor: Color = selectedPlayerColor === 'w' ? 'b' : 'w';
    const ai = new AIAdapter(chessCore, selectedDifficulty, aiColor);
    setAiAdapter(ai);

    if (selectedPlayerColor === 'b') {
      setAppState('engine_turn');
      navigate('/game');
      scheduleEngineMove(ai, 500, currentMatchIdRef.current);
    } else {
      setAppState('player_turn');
      navigate('/game');
    }
  }, [chessCore, navigate, scheduleEngineMove]);

  // Р’С‹Р±РѕСЂ С„РёРіСѓСЂС‹
  const selectSquare = useCallback((square: string) => {
    if (!['player_turn', 'game_ready', 'player_piece_selected'].includes(appState)) return;

    const piece = chessCore.getPieceAt(square);
    if (!piece || piece.color !== playerColor) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    setSelectedSquare(square);
    const moves = chessCore.getLegalMoves(square);
    setLegalMoves(moves);
    setAppState('player_piece_selected');
  }, [appState, chessCore, playerColor]);

  // РЎРґРµР»Р°С‚СЊ С…РѕРґ
  const makeMove = useCallback((to: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
    if (!selectedSquare) return;
    if (!['player_piece_selected', 'player_turn'].includes(appState)) return;

    const move = chessCore.makeMove({
      from: selectedSquare,
      to,
      promotion,
    });

    if (!move) {
      setSelectedSquare(null);
      setLegalMoves([]);
      setAppState('player_turn');
      return;
    }

    // РћР±РЅРѕРІР»СЏРµРј РµР¶РµРґРЅРµРІРЅС‹Рµ Р·Р°РґР°РЅРёСЏ вЂ” СЂРѕРєРёСЂРѕРІРєР°
    if (move.isCastling) {
      updateMissionProgress('make_castling', 1);
    }

    if (move.animationHint) {
      animationSystem.emit({
        type: move.animationHint,
        payload: {
          from: move.from,
          to: move.to,
          piece: move.piece,
          capturedPiece: move.capturedPiece,
        },
        skippable: true,
      });
    }

    setSelectedSquare(null);
    setLegalMoves([]);

    const newState = chessCore.getState();
    setGameState(newState);

    if (newState.isCheckmate || newState.isStalemate || newState.isDraw) {
      finishGameFromState(newState, currentMatchIdRef.current);
      return;
    }

    // РҐРѕРґ РР
    setAppState('engine_turn');
    const wasCapture = move.capturedPiece !== undefined;
    const engineDelay = wasCapture ? 6000 : 800;

    if (aiAdapter) {
      scheduleEngineMove(aiAdapter, engineDelay, currentMatchIdRef.current);
    }

  }, [selectedSquare, appState, chessCore, aiAdapter, animationSystem, navigate, finishGameFromState, scheduleEngineMove]);

  // РћС‚РјРµРЅР° РІС‹Р±РѕСЂР°
  const cancelSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
    setAppState('player_turn');
  }, []);

  // РќРѕРІР°СЏ РёРіСЂР°
  const newGame = useCallback(() => {
    setGameResult(null);
    recordedMatchKeyRef.current = null;
    currentMatchIdRef.current = '';
    clearActiveGameSnapshot();
    startGame(opponentId, difficulty, pieceSkinId, playerColor);
  }, [opponentId, difficulty, pieceSkinId, playerColor, startGame]);

  // Р’ РіР»Р°РІРЅРѕРµ РјРµРЅСЋ
  const goToHome = useCallback(() => {
    chessCore.reset();
    recordedMatchKeyRef.current = null;
    currentMatchIdRef.current = '';
    clearActiveGameSnapshot();
    setGameState(null);
    setGameResult(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    setAppState('home');
    navigate('/home');
  }, [chessCore, navigate]);

  // Р’ РїСЂРѕС„РёР»СЊ
  const resignGame = useCallback(() => {
    const winner: Color = playerColor === 'w' ? 'b' : 'w';
    const currentState = chessCore.getState();

    setGameState(currentState);
    setSelectedSquare(null);
    setLegalMoves([]);
    setGameResult({
      matchId: currentMatchIdRef.current || crypto.randomUUID(),
      winner,
      reason: 'resign',
      moves: currentState.moves.length,
      duration: 0,
    });
    setAppState('game_over');
    navigate('/result');
  }, [chessCore, navigate, playerColor]);

  const goToProfile = useCallback(() => {
    setAppState('profile');
    navigate('/profile');
  }, [navigate]);

  // Р’ РїРѕРґРїРёСЃРєСѓ
  const goToSubscribe = useCallback(() => {
    setAppState('subscribe');
    navigate('/subscribe');
  }, [navigate]);

  // РџСЂРѕРІРµСЂРєР°: РјРѕР¶РµС‚ Р»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РёРіСЂР°С‚СЊ СЃ РїРѕР»РЅС‹РјРё С„РёРіСѓСЂР°РјРё
  const canAccessPaidGame = useCallback((): boolean => {
    if (!PAYMENTS_ENABLED) return true;
    const auth = getAuth();
    // Р“РѕСЃС‚СЊ РјРѕР¶РµС‚ РёРіСЂР°С‚СЊ С‚РѕР»СЊРєРѕ С‡РµСЂРµР· splash в†’ match (free tier)
    if (!auth.isLoggedIn) return false;
    // РђРІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ вЂ” С‚РѕР»СЊРєРѕ СЃ РїРѕРґРїРёСЃРєРѕР№
    return hasSubscription;
  }, [hasSubscription]);

  // Route guard: РµСЃР»Рё Р°РІС‚РѕСЂРёР·РѕРІР°РЅ РЅРѕ РЅРµС‚ РїРѕРґРїРёСЃРєРё вЂ” РЅР° subscribe
  const requireSubscription = useCallback(async (targetState: AppState, targetPath: string) => {
    if (!PAYMENTS_ENABLED) { setAppState(targetState); navigate(targetPath); return true; }
    const auth = getAuth();
    const localSub = getActiveSubscription();
    const activeNow = hasSubscription || localSub.isActive;

    if (!auth.isLoggedIn) {
      setAppState(targetState);
      navigate(targetPath);
      return true;
    }

    if (activeNow) {
      if (localSub.isActive && !hasSubscription) {
        setHasSubscription(true);
      }
      setAppState(targetState);
      navigate(targetPath);
      return true;
    }

    if (subscriptionChecked) {
      try {
        const serverHasSubscription = await refreshSubscriptionFromServer(auth.email);
        if (serverHasSubscription) {
          setAppState(targetState);
          navigate(targetPath);
          return true;
        }
      } catch (error) {
        console.warn('[Billing] Subscription guard server check failed:', error);
      }
    }

    setAppState('subscribe');
    navigate('/subscribe');
    return false;
  }, [hasSubscription, subscriptionChecked, navigate, refreshSubscriptionFromServer]);

  // РќР° СЌРєСЂР°РЅ СЃРїР»СЌС€Р°
  const goToSplash = useCallback(() => {
    setAppState('splash');
    navigate('/');
  }, [navigate]);

  // РђРІС‚РѕСЂРёР·Р°С†РёСЏ РїРѕ email
  const handleLogin = useCallback(async (email: string, childName: string) => {
    console.log('=== USER LOGIN ===');
    clearSubscription();
    setHasSubscription(false);
    loginWithEmail(email, childName);
    if(sessionStorage.getItem("chezzies-save-guest")){
      const guest=localStorage.getItem("gosha-world-v1");
      if(guest)localStorage.setItem(worldKey("chezzies-pending-guest"),guest);
      sessionStorage.removeItem("chezzies-save-guest");
    }

    try {
      await syncPlayerProgressFromServer();
    } catch (error) {
      console.warn('[Progress] Login sync failed:', error);
    }

    try {
      await refreshSubscriptionFromServer(email);
    } catch (error) {
      console.warn('[Billing] Login subscription check failed:', error);
      const localSub = getActiveSubscription();
      setHasSubscription(localSub.isActive);
    }

    const premiumIntent=PAYMENTS_ENABLED && sessionStorage.getItem('chezzies-premium-intent');
    sessionStorage.removeItem('chezzies-premium-intent');
    setAppState(premiumIntent&&!getActiveSubscription().isActive?'subscribe':'home');
    navigate(premiumIntent&&!getActiveSubscription().isActive?'/subscribe':'/home');
  }, [navigate, refreshSubscriptionFromServer]);

  // Выход
  const handleLogout = useCallback(async () => {
    await logoutUser().catch(() => logout());
    clearSubscription();
    setHasSubscription(false);
    setAppState('splash');
    navigate('/');
  }, [navigate]);

  // РћР±СЂР°Р±РѕС‚РєР° СЂРµР·СѓР»СЊС‚Р°С‚Р° РјР°С‚С‡Р° вЂ” РЅР°С‡РёСЃР»РµРЅРёРµ XP Рё РѕР±РЅРѕРІР»РµРЅРёРµ СЃС‚Р°С‚РёСЃС‚РёРєРё
  const handleMatchComplete = useCallback(() => {
    if (!gameResult) return;

    const existingProgress = getPlayerProgress();
    if (gameResult.matchId && existingProgress.matchHistory.some(match => match.matchId === gameResult.matchId)) {
      clearActiveGameSnapshot();
      return;
    }

    const playerWon = gameResult.winner === playerColor;
    const playerLost = gameResult.winner !== playerColor && gameResult.winner !== 'draw' && gameResult.winner !== null;
    const isDraw = gameResult.winner === 'draw' || gameResult.winner === null;
    const isCheckmate = gameResult.reason === 'checkmate' && playerWon;

    const progress = existingProgress;
    const opponent = getCharacter(opponentId);

    // РџРѕРґСЃС‡С‘С‚ РїРѕС‚РµСЂСЏРЅРЅС‹С… С„РёРіСѓСЂ
    const capturedPieces = playerColor === 'w'
      ? gameState?.capturedPieces.w.length || 0
      : gameState?.capturedPieces.b.length || 0;

    // РќР°С‡РёСЃР»СЏРµРј XP
    const xpGained = awardMatchXp({
      won: playerWon,
      isCheckmate,
      winStreak: progress.stats.winStreak + (playerWon ? 1 : 0),
      isFlawless: playerWon && capturedPieces === 0,
    });

    // РћР±РЅРѕРІР»СЏРµРј СЃС‚Р°С‚РёСЃС‚РёРєСѓ
    recordMatchResult({
      matchId: gameResult.matchId,
      won: playerWon,
      lost: playerLost,
      isDraw,
      isCheckmate,
      opponentName: opponent?.name || "Opponent",
      opponentAvatar: opponent?.avatar || "🤖",
      moves: gameResult.moves,
      reason: gameResult.reason,
      playerColor,
      xpGained,
      capturedOwnPieces: capturedPieces,
      capturedEnemyPieces: playerColor === 'w'
        ? gameState?.capturedPieces.b.length || 0
        : gameState?.capturedPieces.w.length || 0,
    });

    // РћР±РЅРѕРІР»СЏРµРј РєСѓР±РєРё
    updateTrophies();

    // РћР±РЅРѕРІР»СЏРµРј РґРѕСЃС‚РёР¶РµРЅРёСЏ
    const updatedProgress = getPlayerProgress();
    if (Object.keys(updatedProgress.achievements).length === 0) {
      updatedProgress.achievements = initAchievements();
    }
    const { achievements: updatedAchievements } = updateAchievementsProgress(
      updatedProgress.achievements,
      updatedProgress.stats
    );
    updateProgress('achievements', updatedAchievements);

    // РћР±РЅРѕРІР»СЏРµРј РµР¶РµРґРЅРµРІРЅС‹Рµ Р·Р°РґР°РЅРёСЏ
    if (playerWon) {
      updateMissionProgress('win_1_game', 1);
      updateMissionProgress('play_2_games', 1);
      updateMissionProgress('play_3_games', 1);
    } else {
      updateMissionProgress('play_2_games', 1);
      updateMissionProgress('play_3_games', 1);
    }
    if (isCheckmate) {
      updateMissionProgress('deliver_checkmate', 1);
    }

    pushPlayerProgressToServer().catch(error => {
      console.warn('[Progress] Match sync failed:', error);
    });

    clearActiveGameSnapshot();

  }, [gameResult, playerColor, opponentId, gameState]);

  useEffect(() => {
    if (appState !== 'game_over' || !gameResult) return;

    const matchKey = [
      gameResult.matchId || '',
      gameResult.winner || 'draw',
      gameResult.reason,
      gameResult.moves,
      playerColor,
      gameState?.fen || '',
    ].join(':');

    if (recordedMatchKeyRef.current === matchKey) return;
    recordedMatchKeyRef.current = matchKey;
    handleMatchComplete();
  }, [appState, gameResult, gameState?.fen, handleMatchComplete, playerColor]);

  // Render
  const renderScreen = () => {
    switch (appState) {
      case 'splash':
        return (
          <SplashScreen
            onPlay={() => {
              setAppState('home');
              navigate('/home');
            }}
            onLogin={() => {
              navigate(getAuth().isLoggedIn ? '/account' : '/login');
            }}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
          />
        );

      case 'reset_password':
        return <ResetPasswordScreen />;

      case 'hero_select':
      case 'home': {
        if (!subscriptionChecked) return <div className="account-loading" role="status">Loading your adventure…</div>;

        return <WorldApp key={getAuth().userId || 'guest'} initialChoose={appState === 'hero_select'}
          initialHero={getAuth().isLoggedIn ? getPlayerProgress().selectedHero || undefined : undefined}
          isGuest={!getAuth().isLoggedIn}
          onAccount={() => navigate('/account')}
          onRegister={()=>{sessionStorage.setItem("chezzies-save-guest","1");navigate("/login");}}
          onPremium={()=>navigate("/subscribe")}
          onSelectHero={(id) => {
            // Keep the existing account profile's selected hero in sync.
            selectHero(id);
            if (getAuth().isLoggedIn) void pushPlayerProgressToServer().catch(() => {});
            if (location.pathname === '/hero-select') navigate('/home', {replace: true});
          }} />;
      }

      case 'profile':
        return (
          <ProfileScreen
            onBack={goToHome}
            onChooseHero={() => {
              setAppState('hero_select');
              navigate('/hero-select');
            }}
            onPlay={() => {
              requireSubscription('match_setup', '/match');
            }}
          />
        );

      case 'match_setup':
        return (
          <MatchSetupScreen
            onStartGame={(opp, diff, skin, color) => {
              startGame(opp, diff, skin, color);
            }}
            onBack={() => {
              const auth = getAuth();
              if (auth.isLoggedIn) {
                goToHome();
              } else {
                goToSplash();
              }
            }}
            initialDifficulty={difficulty}
          />
        );

      case 'game_ready':
      case 'player_turn':
      case 'player_piece_selected':
      case 'engine_turn':
      case 'animation_playing':
        return (
          <GameScreen
            gameState={gameState}
            playerColor={playerColor}
            opponent={getCharacter(opponentId)}
            pieceSkin={getPieceSkin(pieceSkinId)}
            difficulty={getDifficultyPreset(difficulty)}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            onSelectSquare={selectSquare}
            onMakeMove={makeMove}
            onResign={resignGame}
            isEngineTurn={appState === 'engine_turn'}
            isGuest={!getAuth().isLoggedIn}
            onNavigate={navigate}
          />
        );

      case 'game_over':
        return (
          <ResultScreen
            result={gameResult}
            playerColor={playerColor}
            opponent={getCharacter(opponentId)}
            onNewGame={newGame}
            onHome={goToHome}
          />
        );

      case 'subscribe':
        if (!PAYMENTS_ENABLED) return <WorldApp isGuest={!getAuth().isLoggedIn}/>;
        return (
          <SubscribeScreen
            onNavigate={navigate}
          />
        );

      case 'payment':
        if (!PAYMENTS_ENABLED) return <WorldApp isGuest={!getAuth().isLoggedIn}/>;
        return (
          <SubscribeScreen onNavigate={navigate} />
        );

      case 'payment_success':
        if (!PAYMENTS_ENABLED) return <WorldApp isGuest={!getAuth().isLoggedIn}/>;
        return (
          <PaymentSuccessScreen
            onNavigate={navigate}
          />
        );

      case 'billing_required':
        if (!PAYMENTS_ENABLED) return <WorldApp isGuest={!getAuth().isLoggedIn}/>;
        return (
          <BillingRequiredScreen
            onNavigate={navigate}
          />
        );

      case 'admin':
        return <div>Page not found. <a href="/">CHEZZIES home</a></div>;

      default:
        return <div>Unknown state</div>;
    }
  };

  return (
    <div className="app">
      <MobileGameShell path={location.pathname} onNavigate={navigate}><div className="app-content">
      {['login', 'reset_password'].includes(appState) &&
        <button className="account-back" onClick={() => navigate(getAuth().isLoggedIn ? '/account' : '/')}>← Back</button>}
{location.pathname === '/account' ? <div className="world-account">
        <h1>Parent account</h1>
        <p>{getAuth().isLoggedIn ? getAuth().email : "You are playing as a guest."}</p>
        <p>{getAuth().isLoggedIn ? "Hero progress is saved separately for your account." : "Your guest adventure stays on this device after you sign in."}</p>
        <button onClick={goToHome}>Return to the world</button>
        {getAuth().isLoggedIn ? <>
          {PAYMENTS_ENABLED && <button onClick={goToSubscribe}>Subscription and promo code</button>}
          <button onClick={goToProfile}>Profile and previous games</button>
          <button onClick={()=>{sessionStorage.setItem('chezzies-mobile-destination','parent');navigate('/home');}}>Child’s progress</button>
          <button onClick={()=>{sessionStorage.setItem('chezzies-mobile-destination','trophies');navigate('/home');}}>Achievements</button>
          <button onClick={handleLogout}>Sign out</button>
        </> : <button onClick={() => navigate('/login')}>Sign in or register</button>}
      </div> : renderScreen()}
      </div>
      </MobileGameShell>
      {appState !== 'admin' && <SupportChat key={getAuth().userId || 'guest'} />}
    </div>
  );
}



