# 🐛 Debug Log Инструкция

## Как включить логи

Логи уже добавлены в код. Откройте консоль браузера (F12) и вы увидите все события.

## Где смотреть логи

1. **Откройте игру:** http://localhost:5173
2. **Нажмите F12** (или правая кнопка → Inspect)
3. **Перейдите на вкладку "Console"**
4. **Начните играть** - кликайте на фигуры

## Что вы увидите в консоли

### 1. Клик на фигуру (выбор):
```
=== SELECT SQUARE ===
Square: e2
Piece at e2 : { type: 'p', color: 'w' }
Legal moves: [ { from: 'e2', to: 'e4', ... }, { from: 'e2', to: 'e3', ... } ]
```

### 2. Клик на клетку хода:
```
=== HANDLE SQUARE CLICK ===
Square: e4
Piece: null
SelectedSquare: e2
IsPlayerTurn: true
PossibleMoves: [ 'e4', 'e3' ]
✅ VALID MOVE CLICKED
📍 NORMAL MOVE
🚀 Calling onMakeMove( e4 )

=== MAKE MOVE ===
From: e2
To: e4
AppState: player_piece_selected
🚀 Making move...
Move result: { from: 'e2', to: 'e4', ... }
📊 New state: { fen: '...', turn: 'b', ... }
🤖 ENGINE TURN
```

### 3. Если что-то не работает:
```
=== HANDLE SQUARE CLICK ===
Square: e4
❌ RETURN: Not player turn or engine turn
```

Или:
```
=== MAKE MOVE ===
❌ No selected square
```

## Ошибки для отслеживания

### ❌ "Wrong appState"
Проблема: состояние не позволяет сделать ход
Решение: Проверить переходы состояний

### ❌ "MOVE FAILED"  
Проблема: chessCore не принимает ход
Решение: Проверить легальность хода

### ❌ "Not player piece"
Проблема: Кликнули на чужую фигуру
Это нормально

## Последовательность событий

```
1. Клик на пешку
   ↓
2. onSelectSquare('e2')
   ↓
3. appState: 'player_piece_selected'
   ↓
4. legalMoves отображаются
   ↓
5. Клик на e4
   ↓
6. onMakeMove('e4')
   ↓
7. chessCore.makeMove()
   ↓
8. setGameState(newState)
   ↓
9. appState: 'engine_turn'
   ↓
10. AI делает ход
    ↓
11. appState: 'player_turn'
```

## Примеры логов

### ✅ Нормальный ход:
```
=== SELECT SQUARE ===
Square: e2
Piece: { type: 'p', color: 'w' }
Legal moves: [ ... ]

=== HANDLE SQUARE CLICK ===
Square: e4
✅ VALID MOVE CLICKED
📍 NORMAL MOVE

=== MAKE MOVE ===
From: e2
To: e4
Move result: { ... }
📊 New state: { ... }
🤖 ENGINE TURN
```

### ❌ Проблема (не тот appState):
```
=== SELECT SQUARE ===
Square: e2
❌ Wrong appState: engine_turn
```

### ❌ Проблема (не выбран квадрат):
```
=== MAKE MOVE ===
From: null
To: e4
❌ No selected square
```

## Что копировать при ошибке

Если фигуры не ходят, скопируйте ВСЮ консоль после:
1. Клика на фигуру
2. Клика на клетку

И отправьте разработчику.

---

**Дата:** 18 апреля 2026  
**Статус:** DEBUG MODE ENABLED
