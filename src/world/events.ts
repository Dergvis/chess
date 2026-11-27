export type WorldEvent = "difficulty_assigned" | "difficulty_increased" | "difficulty_decreased" | "topic_mastery_updated" | "global_skill_updated" | "mastery_challenge_unlocked" | "mastery_challenge_started" | "new_region_unlocked" | "misty_difficulty_changed" | "misty_run_started" | "misty_run_ended" | "intro_video_completed" | "play_free_clicked" | "guest_session_started" | "save_progress_prompt_shown" | "save_progress_prompt_skipped" | "registration_started" | "registration_completed" | "premium_paywall_viewed" | "premium_started" | "premium_source" | "mastery_updated" | "weak_topic_detected" | "training_recommended" | "training_started" | "training_completed" | "misty_puzzle_started" | "misty_puzzle_solved" | "parent_progress_viewed"
  | "hero_selected" | "experience_selected" | "world_first_view" | "location_opened"
  | "stage_started" | "puzzle_started" | "puzzle_solved" | "puzzle_failed" | "hint_used"
  | "stage_completed" | "guardian_started" | "guardian_defeated" | "upgrade_received"
  | "upgrade_demo_completed" | "world_location_unlocked" | "training_ground_opened" | "misty_lands_opened" | "misty_lands_unlocked"
  | "mini_game_opened"
  | "mini_game_started"
  | "mini_game_finished"
  | "weapon_tested"
  | "new_personal_record"
  | "mini_game_return_to_map"
  | "mini_game_to_chess_action"
  | "map_opened"
  | "territory_selected"
  | "character_travel_started"
  | "character_arrived"
  | "challenge_started"
  | "challenge_completed"
  | "mastery_progress"
  | "first_win"
  | "reward_unlocked"
  | "game_started"
  | "game_finished"
  | "game_result"
  | "post_game_review_opened"
  | "post_game_puzzle_started"
  | "post_game_puzzle_completed"
  | "skill_detected"
  | "real_game_skill_used"
  | "adaptive_bot_strength_changed"
  | "next_recommendation_clicked";
export interface EventEnvelope {
  id: string;
  eventName: WorldEvent;
  timestamp: string;
  metadata: Record<string, unknown>;
}
const sinks = new Set<(event: EventEnvelope) => void>();
export const connectAnalytics = (sink: (event: EventEnvelope) => void) => {
  sinks.add(sink);
  return () => { sinks.delete(sink); };
};
export function emit(
  eventName: WorldEvent,
  metadata: Record<string, unknown> = {}
) {
  if (/premium|payment|paywall/.test(eventName)) return;
  const event: EventEnvelope = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    eventName,
    timestamp: new Date().toISOString(),
    metadata,
  };
  try {
    const events = JSON.parse(
      localStorage.getItem("gosha-world-events-v1") || "[]"
    );
    localStorage.setItem(
      "gosha-world-events-v1",
      JSON.stringify([...events, event].slice(-500))
    );
  } catch {
    /* Analytics must not interrupt play. */
  }
  sinks.forEach((s) => {
    try {
      s(event);
    } catch {}
  });
  // Same origin local service. No Metrika, production API or personal information.
  // International analytics is bridged to the restricted site event allowlist.
}
