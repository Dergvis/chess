import { useState, useEffect, useCallback } from 'react';
import { ChessCore } from '../entities/chess/ChessCore';
import { AIAdapter } from '../features/game/AIAdapter';
import { AnimationEventSystem } from '../entities/animation/AnimationEventSystem';
import type { Color, Move, DifficultyLevel, GameState, GameResult, AppState } from '../shared/types';
import { getCharacter } from '../entities/character/characters';
import { getPieceSkin } from '../entities/piece-skins/pieceSkins';
import { getDifficultyPreset } from '../shared/config/difficulty';
import { getSettings, updateSetting } from '../shared/storage/settingsStorage';
import HomeScreen from '../features/onboarding/HomeScreen';
import MatchSetupScreen from '../features/opponents/MatchSetupScreen';
import GameScreen from '../features/game/GameScreen';
import ResultScreen from '../features/game/ResultScreen';
import OnboardingScreen from '../features/onboarding/OnboardingScreen';
import './App.css';

function App() {
  const [appState, setAppState] = useState<AppState>('boot');
  const [chessCore] = useState(() => new ChessCore());
  const [aiAdapter, setAiAdapter] = useState<AIAdapter | null>(null);
  const [animationSystem] = useState(() => new AnimationEventSystem());
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  
  // Настройки игры
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [opponentId, setOpponentId] = useState<string>('bear');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('level_1');
  const [pieceSkinId, setPieceSkinId] = useState<string>('block');

  // Инициализация при загрузке
  useEffect(() => {
    console.log('=== APP INIT ===');
    const settings = getSettings();
    
    if (settings.onboardingCompleted) {
      setAppState('home');
    } else {
      setAppState('onboarding');
    }
    
    setOpponentId(settings.opponentId);
    setDifficulty(settings.difficulty);
    setPieceSkinId(settings.pieceSkinId);
    
    animationSystem.setIntensity(settings.animationIntensity);
    
    return () => {
      chessCore.reset();
    };
  }, []);

  // Запуск игры
  const startGame = useCallback((
    selectedOpponentId: string,
    selectedDifficulty: DifficultyLevel,
    selectedPieceSkinId: string,
    playerColor: Color = 'w'
  ) => {
    console.log('=== START GAME ===');
    console.log('Opponent:', selectedOpponentId);
    console.log('Difficulty:', selectedDifficulty);
    console.log('PieceSkin:', selectedPieceSkinId);
    console.log('PlayerColor:', playerColor);
    
    setOpponentId(selectedOpponentId);
    setDifficulty(selectedDifficulty);
    setPieceSkinId(selectedPieceSkinId);
    setPlayerColor(playerColor);
    
    updateSetting({
      opponentId: selectedOpponentId,
      difficulty: selectedDifficulty,
      pieceSkinId: selectedPieceSkinId,
    });
    
    chessCore.reset();
    setGameState(chessCore.getState());
    
    const aiColor: Color = playerColor === 'w' ? 'b' : 'w';
    const ai = new AIAdapter(chessCore, selectedDifficulty, aiColor);
    setAiAdapter(ai);
    
    setAppState('game_ready');
  }, [chessCore]);

  // Выбор фигуры
  const selectSquare = useCallback((square: string) => {
    console.log('=== SELECT SQUARE ===');
    console.log('Square:', square);
    
    if (appState !== 'player_turn' && appState !== 'game_ready') {
      console.log('❌ Wrong appState:', appState);
      return;
    }
    
    const piece = chessCore.getPieceAt(square);
    console.log('Piece at', square, ':', piece);
    
    if (!piece || piece.color !== playerColor) {
      console.log('❌ Not player piece');
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }
    
    setSelectedSquare(square);
    const moves = chessCore.getLegalMoves(square);
    console.log('Legal moves:', moves);
    setLegalMoves(moves);
    setAppState('player_piece_selected');
  }, [appState, chessCore, playerColor]);

  // Сделать ход
  const makeMove = useCallback((to: string) => {
    console.log('=== MAKE MOVE ===');
    console.log('From:', selectedSquare);
    console.log('To:', to);
    console.log('AppState:', appState);
    
    if (!selectedSquare) {
      console.log('❌ No selected square');
      return;
    }
    
    if (appState !== 'player_piece_selected' && appState !== 'player_turn') {
      console.log('❌ Wrong appState:', appState);
      return;
    }

    console.log('🚀 Making move...');
    const move = chessCore.makeMove({
      from: selectedSquare,
      to,
    });

    console.log('Move result:', move);

    if (!move) {
      console.log('❌ MOVE FAILED');
      setSelectedSquare(null);
      setLegalMoves([]);
      setAppState('player_turn');
      return;
    }

    // Анимация
    if (move.animationHint) {
      console.log('🎬 Animation:', move.animationHint);
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
    console.log('📊 New state:', newState);
    setGameState(newState);

    // Конец игры?
    if (newState.isCheckmate || newState.isStalemate || newState.isDraw) {
      console.log('🏁 GAME OVER');
      const result: GameResult = {
        winner: chessCore.getWinner(),
        reason: newState.isCheckmate ? 'checkmate' : newState.isStalemate ? 'stalemate' : 'draw',
        moves: newState.moves.length,
        duration: 0,
      };
      setGameResult(result);
      setAppState('game_over');
      return;
    }

    // Ход ИИ
    console.log('🤖 ENGINE TURN');
    setAppState('engine_turn');

    setTimeout(async () => {
      console.log('🤖 Engine thinking...');
      if (aiAdapter) {
        const aiMove = await aiAdapter.getBestMove();
        console.log('🤖 Engine move:', aiMove);
        
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
            const gameResult: GameResult = {
              winner: chessCore.getWinner(),
              reason: newState.isCheckmate ? 'checkmate' : newState.isStalemate ? 'stalemate' : 'draw',
              moves: newState.moves.length,
              duration: 0,
            };
            setGameResult(gameResult);
            setAppState('game_over');
            return;
          }
        }
        
        console.log('🎮 PLAYER TURN');
        setAppState('player_turn');
      }
    }, 500);
    
  }, [selectedSquare, appState, chessCore, aiAdapter, animationSystem]);

  // Отмена выбора
  const cancelSelection = useCallback(() => {
    console.log('=== CANCEL SELECTION ===');
    setSelectedSquare(null);
    setLegalMoves([]);
    setAppState('player_turn');
  }, []);

  // Новая игра
  const newGame = useCallback(() => {
    setGameResult(null);
    startGame(opponentId, difficulty, pieceSkinId, playerColor);
  }, [opponentId, difficulty, pieceSkinId, playerColor, startGame]);

  // В главное меню
  const goToHome = useCallback(() => {
    chessCore.reset();
    setGameState(null);
    setGameResult(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    setAppState('home');
  }, [chessCore]);

  // Завершение онбординга
  const completeOnboarding = useCallback(() => {
    setAppState('home');
  }, []);

  // Рендер
  const renderScreen = () => {
    switch (appState) {
      case 'boot':
        return <div className="boot-screen">Загрузка...</div>;
      
      case 'onboarding':
        return <OnboardingScreen onComplete={completeOnboarding} />;
      
      case 'home':
        return <HomeScreen onPlay={() => setAppState('match_setup')} onSettings={() => {}} />;
      
      case 'match_setup':
        return (
          <MatchSetupScreen 
            onStartGame={startGame}
            onBack={goToHome}
            initialOpponent={opponentId}
            initialDifficulty={difficulty}
            initialPieceSkin={pieceSkinId}
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
            onCancelSelection={cancelSelection}
            onResign={goToHome}
            isEngineTurn={appState === 'engine_turn'}
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
      
      default:
        return <div>Unknown state</div>;
    }
  };

  return (
    <div className="app">
      {renderScreen()}
    </div>
  );
}

export default App;
