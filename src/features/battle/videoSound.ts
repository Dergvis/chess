// Глобальный менеджер звука для видео
// На мобильных autoplay со звуком заблокирован — начинаем muted,
// включаем звук после первого пользовательского жеста (клика/тапа)

import { getSettings } from '../../shared/storage/settingsStorage';
let soundEnabled = false;
const listeners: Array<(enabled: boolean) => void> = [];

// Слушаем первый клик/тап для включения звука
function onFirstGesture() {
  if (!soundEnabled) {
    soundEnabled = true;
    listeners.forEach(fn => fn(getSettings().soundEnabled));
    document.removeEventListener('click', onFirstGesture, true);
    document.removeEventListener('touchend', onFirstGesture, true);
  }
}

document.addEventListener('click', onFirstGesture, { once: true, capture: true });
document.addEventListener('touchend', onFirstGesture, { once: true, capture: true });

/** Вернуть true, если звук разрешён (был пользовательский жест) */
export function isSoundEnabled(): boolean {
  return soundEnabled && getSettings().soundEnabled;
}
window.addEventListener('chezzies-sound-change',()=>listeners.forEach(fn=>fn(isSoundEnabled())));

/** Подписаться на изменение состояния звука */
export function onSoundChange(callback: (enabled: boolean) => void): () => void {
  listeners.push(callback);
  return () => {
    const i = listeners.indexOf(callback);
    if (i !== -1) listeners.splice(i, 1);
  };
}
