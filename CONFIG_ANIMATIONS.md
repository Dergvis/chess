# 🎬 Конфигурационная система анимаций

## 📋 Обзор

Реализована **конфигурационная система анимаций** на основе JSON-файлов. Все анимации, реакции и события описываются в конфигах, а не в коде.

### Преимущества:
- ✅ **Легко расширять** — добавляй анимации через JSON, без изменения кода
- ✅ **Баланс игры** — настраивай длительность, пулы анимаций
- ✅ **Персонажи** — у каждого свои предпочтения и реакции
- ✅ **Event-driven** — маппинг событий на анимации

---

## 📁 Структура конфигов

```
src/config/
├── animations.json      # Конфигурация анимаций взятия
├── reactions.json       # Реакции персонажей
├── eventMapping.json    # Маппинг событий на анимации
├── opponents.json       # Персонажи с настройками
├── types.ts            # TypeScript-типы
└── animationEngine.ts  # Движок воспроизведения
```

---

## 🎬 animations.json

### Структура анимации:

```json
{
  "id": "catapult",
  "name": "Катапульта",
  "type": "capture",
  "flavor": "cartoon",
  "duration": {
    "full": 1.8,
    "short": 1.0,
    "minimal": 0.3
  },
  "skippable": true,
  "sequence": [
    { "action": "spawn_object", "object": "catapult", "delay": 0 },
    { "action": "attach_target", "to": "catapult", "delay": 0.1 },
    { "action": "delay", "time": 0.3 },
    { "action": "launch", "target": "enemy_piece", "direction": "up-right" },
    { "action": "play_effect", "effect": "puff" },
    { "action": "despawn", "target": "enemy_piece", "delay": 0.2 }
  ],
  "sound": "catapult_pop",
  "description": "Фигура запускается из катапульты"
}
```

### Доступные действия (actions):

#### Для объектов:
- `spawn_object` — создать объект
- `despawn` — удалить объект
- `attach_target` — прикрепить цель
- `insert` — вставить в объект

#### Для движения:
- `launch` — запустить
- `launch_up` — запустить вверх
- `fire` — выстрелить
- `slide_out` — выскользнуть
- `lift_up` — поднять
- `fall_backward` — упасть назад

#### Для эффектов:
- `play_effect` — воспроизвести эффект
- `flash` — вспышка
- `sparkles_around` — искры вокруг

#### Для реакций:
- `jump` — прыжок
- `face` — эмоция
- `shake` — потряхивание
- `wave` — помахать
- `cheer` — ликовать
- `spin` — вращение

### 12 анимаций взятия:

| ID | Название | Flavor | Длительность (full) |
|----|----------|--------|---------------------|
| `catapult` | Катапульта | cartoon | 1.8с |
| `cannon` | Пушка | playful | 1.5с |
| `banana_slip` | Банан | cartoon | 1.4с |
| `spring_launch` | Пружина | cartoon | 1.3с |
| `ambulance` | Скорая | cartoon | 2.0с |
| `rocket` | Ракета | tech | 1.6с |
| `trapdoor` | Люк | playful | 1.0с |
| `fan_blow` | Вентилятор | playful | 1.2с |
| `balloons_lift` | Шарики | magical | 1.6с |
| `teleport` | Телепорт | tech | 1.0с |
| `spider_web` | Паутинка | playful | 1.4с |
| `broom_sweep` | Метла | cartoon | 1.3с |

---

## 😊 reactions.json

### Структура реакции:

```json
{
  "id": "scared_jump",
  "name": "Испуганный прыжок",
  "type": "check",
  "duration": 0.8,
  "sequence": [
    { "action": "jump", "height": 20, "delay": 0 },
    { "action": "face", "emotion": "scared", "delay": 0 },
    { "action": "shake", "time": 0.3, "delay": 0.2 },
    { "action": "land", "delay": 0.3 }
  ],
  "sound": "scared_squeak"
}
```

### Типы реакций:

#### На шах (check):
- `scared_jump` — испуганный прыжок
- `angry_look` — злой взгляд
- `cry_tear` — слеза
- `explode_head` — взрыв мозга
- `helmet_drop` — шлем/кастрюля

#### На мат (checkmate):
**Проигрыш:**
- `white_flag` — белый флаг
- `suitcase_sit` — чемодан
- `crown_slide` — съехавшая корона
- `theatrical_fall` — театральное падение
- `disappear` — исчезновение

**Победа:**
- `victory_dance` — танец победы
- `royal_victory` — королевская победа
- `magic_explosion` — магический взрыв

#### На начало игры:
- `wave` — приветствие
- `royal_nod` — королевский кивок
- `magic_spell` — магическое приветствие

---

## 🎯 eventMapping.json

### Маппинг событий:

```json
{
  "eventMapping": {
    "MOVE_CAPTURE": {
      "type": "pool",
      "pool": ["catapult", "cannon", "banana_slip", ...],
      "random": true,
      "sound": "capture_generic"
    },
    "STATE_CHECK": {
      "type": "reaction",
      "pool": ["scared_jump", "angry_look", "surprised_gasps"],
      "random": true,
      "text": "⚠️ ШАХ!",
      "sound": "check_alert"
    },
    "STATE_CHECKMATE": {
      "type": "scene",
      "winner": {
        "animation": "victory_pose",
        "effects": ["confetti", "sparkles"]
      },
      "loser": {
        "pool": ["white_flag", "suitcase_sit", "crown_slide", "theatrical_fall"],
        "random": true
      },
      "text": "🏆 МАТ! 🏆",
      "sound": "checkmate_final"
    }
  }
}
```

### Типы маппинга:

#### `pool` — Пул анимаций
Случайный выбор из списка:
```json
{
  "type": "pool",
  "pool": ["anim1", "anim2", "anim3"],
  "random": true
}
```

#### `reaction` — Реакция персонажа
Используется с персонажами:
```json
{
  "type": "reaction",
  "pool": ["react1", "react2"],
  "random": true
}
```

#### `scene` — Сцена
Для мата/пата:
```json
{
  "type": "scene",
  "winner": { "animation": "...", "effects": [...] },
  "loser": { "pool": [...], "random": true }
}
```

---

## 👤 opponents.json

### Структура персонажа:

```json
{
  "id": "builder_bob",
  "name": "Боб-строитель",
  "theme": "block",
  "avatar": "/assets/characters/builder_bob.png",
  "description": "Весёлый строитель, любит простые ходы",
  "difficultyPreset": "easy",
  "personality": {
    "aggression": 0.3,
    "emotionsIntensity": 0.8,
    "animationStyle": "funny"
  },
  "reactions": {
    "onGameStart": "wave",
    "onCapture": "happy_jump",
    "onLosePiece": "sad_shake",
    "onCheck": "scared_jump",
    "onCheckmateWin": "victory_dance",
    "onCheckmateLose": "white_flag"
  },
  "soundPack": "funny_kids",
  "voiceStyle": "cartoon",
  "preferredAnimationFlavor": "cartoon"
}
```

### 3 персонажа:

#### Боб-строитель (builder_bob)
- **Стиль:** cartoon
- **Сложность:** easy
- **Реакции:** весёлые, простые

#### Королева Луна (queen_luna)
- **Стиль:** elegant
- **Сложность:** medium
- **Реакции:** изящные, спокойные

#### Волшебник Макс (wizard_max)
- **Стиль:** dramatic
- **Сложность:** hard
- **Реакции:** драматичные, магические

---

## 🚀 Использование

### В коде игры:

```typescript
import { animationEngine } from './config/animationEngine';

// Получить анимацию для взятия
const animation = animationEngine.getAnimationForEvent(
  'MOVE_CAPTURE',
  opponent.preferredAnimationFlavor
);

// Воспроизвести анимацию
await animationEngine.playAnimation(animation, 'full', {
  onAction: (action, index) => {
    console.log('Action:', action);
  },
  onComplete: () => {
    console.log('Animation complete!');
  }
});

// Получить реакцию на шах
const reaction = animationEngine.getReactionForEvent(
  'STATE_CHECK',
  opponent.id
);

// Получить сцену мата
const checkmateScene = animationEngine.getCheckmateScene();
```

---

## 🔧 Расширение

### Добавить новую анимацию:

1. **Открыть** `animations.json`
2. **Добавить** новую анимацию:
```json
{
  "id": "my_animation",
  "name": "Моя анимация",
  "type": "capture",
  "flavor": "cartoon",
  "duration": { "full": 1.5, "short": 0.8, "minimal": 0.3 },
  "skippable": true,
  "sequence": [
    { "action": "spawn_object", "object": "my_object", "delay": 0 },
    { "action": "launch_up", "height": 200, "delay": 0.3 },
    { "action": "despawn", "target": "enemy_piece", "delay": 0.2 }
  ],
  "sound": "my_sound"
}
```
3. **Добавить** в `eventMapping.json`:
```json
"MOVE_CAPTURE": {
  "pool": [..., "my_animation"],
  "random": true
}
```
4. **Создать** CSS-классы для `.my_object`

### Добавить новую реакцию:

1. **Открыть** `reactions.json`
2. **Добавить** реакцию:
```json
{
  "id": "my_reaction",
  "name": "Моя реакция",
  "type": "check",
  "duration": 0.7,
  "sequence": [
    { "action": "face", "emotion": "surprised", "delay": 0 },
    { "action": "jump", "height": 15, "delay": 0.1 }
  ],
  "sound": "my_sound"
}
```
3. **Добавить** в `eventMapping.json` или персонажу

### Добавить персонажа:

1. **Открыть** `opponents.json`
2. **Добавить** персонажа:
```json
{
  "id": "new_character",
  "name": "Новый персонаж",
  "theme": "space",
  "avatar": "/assets/characters/new_character.png",
  "difficultyPreset": "hard",
  "personality": {
    "aggression": 0.8,
    "emotionsIntensity": 1.0,
    "animationStyle": "sci-fi"
  },
  "reactions": {
    "onGameStart": "laser_wave",
    "onCheck": "shield_up",
    "onCheckmateWin": "galaxy_celebrate",
    "onCheckmateLose": "teleport_away"
  },
  "preferredAnimationFlavor": "tech"
}
```

---

## 📊 Итого

| Компонент | Файл | Количество |
|-----------|------|------------|
| Анимации взятия | `animations.json` | 12 |
| Реакции | `reactions.json` | 18 |
| События | `eventMapping.json` | 10 |
| Персонажи | `opponents.json` | 3 |

### Архитектура:

```
┌─────────────────────────────────────────────────────────┐
│                    GameScreen.tsx                       │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │          animationEngine (singleton)             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │   │
│  │  │animations  │  │reactions   │  │eventMapping│ │   │
│  │  │Map         │  │Map         │  │Map         │ │   │
│  │  └────────────┘  └────────────┘  └────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
│                           │                              │
│         ┌─────────────────┼─────────────────┐           │
│         ▼                 ▼                 ▼            │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐      │
│  │animations. │   │reactions.  │   │eventMapping│      │
│  │json        │   │json        │   │.json       │      │
│  └────────────┘   └────────────┘   └────────────┘      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              opponents.json                     │   │
│  │  • builder_bob (cartoon)                        │   │
│  │  • queen_luna (magical)                         │   │
│  │  • wizard_max (tech)                            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Сборка

```bash
# Проверка типов
npm run build

# Запуск dev-сервера
npm run dev
```

**Конфигурационная система готова!** 🎉

Все анимации и реакции настраиваются через JSON без изменения кода.
