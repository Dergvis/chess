// Маппинг сценариев боя к именам файлов видео
// Формат: attackerColor_attackerType_vs_defenderType => имя файла без .mp4 (из public/Video)

export const battleVideoMap: Record<string, string> = {
  // ========== БЕЛЫЕ ПЕШКИ (w_p) ==========
  'w_p_vs_p': 'w_p_vs_p',
  'w_p_vs_n': 'w_p_vs_n',
  'w_p_vs_b': 'w_p_vs_b',
  'w_p_vs_r': 'w_p_vs_r',
  'w_p_vs_q': 'w_p_vs_q',
  'w_p_vs_k': 'w_p_vs_k',

  // ========== БЕЛЫЕ КОНИ (w_n) ==========
  'w_n_vs_p': 'w_n_vs_p',
  'w_n_vs_n': 'w_n_vs_n',
  'w_n_vs_b': 'w_n_vs_b',
  'w_n_vs_r': 'w_n_vs_r',
  'w_n_vs_q': 'w_n_vs_q',
  'w_n_vs_k': 'w_n_vs_k',

  // ========== БЕЛЫЕ ОФИЦЕРЫ (w_b) ==========
  'w_b_vs_p': 'w_b_vs_p',
  'w_b_vs_n': 'w_b_vs_n',
  'w_b_vs_b': 'w_b_vs_b',
  'w_b_vs_r': 'w_b_vs_r',
  'w_b_vs_q': 'w_b_vs_q',
  'w_b_vs_k': 'w_b_vs_k',

  // ========== БЕЛЫЕ ЛАДЬИ (w_r) ==========
  'w_r_vs_p': 'w_r_vs_p',
  'w_r_vs_n': 'w_r_vs_n',
  'w_r_vs_b': 'w_r_vs_b',
  'w_r_vs_r': 'w_r_vs_r',
  'w_r_vs_q': 'w_r_vs_q',
  'w_r_vs_k': 'w_r_vs_k',

  // ========== БЕЛЫЕ КОРОЛЕВЫ (w_q) ==========
  'w_q_vs_p': 'w_q_vs_p',
  'w_q_vs_n': 'w_q_vs_n',
  'w_q_vs_b': 'w_q_vs_b',
  'w_q_vs_r': 'w_q_vs_r',
  'w_q_vs_q': 'w_q_vs_q',
  'w_q_vs_k': 'w_q_vs_k',

  // ========== БЕЛЫЕ КОРОЛИ (w_k) ==========
  'w_k_vs_p': 'w_k_vs_p',
  'w_k_vs_n': 'w_k_vs_n',
  'w_k_vs_b': 'w_k_vs_b',
  'w_k_vs_r': 'w_k_vs_r',
  'w_k_vs_q': 'w_k_vs_q',
  'w_k_vs_k': '',  // Нет видео (король не бьёт короля)

  // ========== ЧЁРНЫЕ ПЕШКИ (b_p) ==========
  'b_p_vs_p': 'b_p_vs_p',
  'b_p_vs_n': 'b_p_vs_n',
  'b_p_vs_b': 'b_p_vs_b',
  'b_p_vs_r': 'b_p_vs_r',
  'b_p_vs_q': 'b_p_vs_q',
  'b_p_vs_k': 'b_p_vs_k',

  // ========== ЧЁРНЫЕ КОНИ (b_n) ==========
  'b_n_vs_p': 'b_n_vs_p',
  'b_n_vs_n': 'b_n_vs_n',
  'b_n_vs_b': 'b_n_vs_b',
  'b_n_vs_r': 'b_n_vs_r',
  'b_n_vs_q': 'b_n_vs_q',
  'b_n_vs_k': 'b_n_vs_k',

  // ========== ЧЁРНЫЕ ОФИЦЕРЫ (b_b) ==========
  'b_b_vs_p': 'b_b_vs_p',
  'b_b_vs_n': 'b_b_vs_n',
  'b_b_vs_b': 'b_b_vs_b',
  'b_b_vs_r': 'b_b_vs_r',
  'b_b_vs_q': 'b_b_vs_q',
  'b_b_vs_k': 'b_b_vs_k',

  // ========== ЧЁРНЫЕ ЛАДЬИ (b_r) ==========
  'b_r_vs_p': 'b_r_vs_p',
  'b_r_vs_n': 'b_r_vs_n',
  'b_r_vs_b': 'b_r_vs_b',
  'b_r_vs_r': 'b_r_vs_r',
  'b_r_vs_q': 'b_r_vs_q',
  'b_r_vs_k': 'b_r_vs_k',

  // ========== ЧЁРНЫЕ КОРОЛЕВЫ (b_q) ==========
  'b_q_vs_p': 'b_q_vs_p',
  'b_q_vs_n': 'b_q_vs_n',
  'b_q_vs_b': 'b_q_vs_b',
  'b_q_vs_r': 'b_q_vs_r',
  'b_q_vs_q': 'b_q_vs_q',
  'b_q_vs_k': 'b_q_vs_k',

  // ========== ЧЁРНЫЕ КОРОЛИ (b_k) ==========
  'b_k_vs_p': 'b_k_vs_p',
  'b_k_vs_n': 'b_k_vs_n',
  'b_k_vs_b': 'b_k_vs_b',
  'b_k_vs_r': 'b_k_vs_r',
  'b_k_vs_q': 'b_k_vs_q',
  'b_k_vs_k': '',  // Нет видео (король не бьёт короля)
};

// Видео мата
export const checkmateVideos: Record<'w' | 'b', string> = {
  w: 'checkmate_w',
  b: 'checkmate_b',
};

/**
 * Получить имя видео для сценария боя
 * @returns Имя файла без расширения или null если видео нет
 */
export function getBattleVideoName(
  attackerColor: 'w' | 'b',
  attackerType: string,
  defenderType: string
): string | null {
  const key = `${attackerColor}_${attackerType}_vs_${defenderType}`;
  console.log('[getBattleVideoName] key:', key, 'found:', !!battleVideoMap[key]);
  const name = battleVideoMap[key];
  return name && name.trim() ? name : null;
}
