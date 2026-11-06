import { chooseBotMove, analyzeGame, search } from "./engine";
import { candidateMoves } from './challenges/acceptance';
self.onmessage = ({ data }) => {
  try {
    if (data.type === 'candidates') {
      self.postMessage({id:data.id,result:candidateMoves(data.exercise)});
      return;
    }
    if(data.type==='challengeReply'){
      self.postMessage({id:data.id,result:search(data.fen,{depth:2,timeMs:60000}).ranked[0]?.move||null});
      return;
    }
    if (data.type === "hint") {
      self.postMessage({
        id: data.id,
        result:
          search(data.fen, { depth: 3, timeMs: 1200 }).ranked[0]?.move || null,
      });
      return;
    }
    if (data.type === "grade") {
      const s = search(data.fen, { depth: 3, timeMs: 250 });
      const chosen = s.ranked.find((m) => m.move === data.move);
      self.postMessage({
        id: data.id,
        result: {
          move: data.move,
          loss: Math.max(0, (s.ranked[0]?.score || 0) - (chosen?.score || 0)),
          depth: s.depth,
        },
      });
      return;
    }
    const result =
      data.type === "move"
        ? chooseBotMove(data.fen, data.level, data.strength)
        : analyzeGame(data.game);
    self.postMessage({ id: data.id, result });
  } catch (e) {
    self.postMessage({ id: data.id, error: String(e) });
  }
};
