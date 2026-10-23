// Маппинг сценариев
import { battleVideoMap, checkmateVideos, getBattleVideoName } from './battleVideoMap';

/**
 * Получить URL видео для взятия фигуры из public/Видео
 */
export function getBattleVideo(
  attackerColor: 'w' | 'b',
  attackerType: string,
  defenderType: string
): string | null {
  const videoName = getBattleVideoName(attackerColor, attackerType, defenderType);

  if (!videoName) {
    console.log("[getBattleVideo] No mapping for:", { attackerColor, attackerType, defenderType });
    return null;
  }

  return `/Video/${videoName}.mp4`;
}

/**
 * Получить URL видео мата из public/Видео
 */
export function getCheckmateVideo(victimColor: 'w' | 'b'): string | null {
  const videoName = checkmateVideos[victimColor];
  return `/Video/${videoName}.mp4`;
}
