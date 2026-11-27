import type { WorldSave } from "./types";
export const durabilityByStage = [100, 70, 50, 30, 0];
export function gateDurability(save: WorldSave, skill: string) {
  return durabilityByStage[
    Math.min(4, save.learning?.paths[skill]?.completed.length || 0)
  ];
}
export function learningStageNames(skill: string) {
 const names:Record<string,string[]>={
  mate:["Learn to checkmate","Find the mating move","Give checkmate"],
  fork:["Learn to make a fork","Find a fork opportunity","Make a fork"],
  pin:["Learn to make a pin","Find a pin opportunity","Create a pin"],
  doubleAttack:["Learn to make a double attack","Find a double threat","Create two threats"],
  defense:["Learn to defend","Find the threat","Protect your pieces"],
 };
 return [...(names[skill]||["Watch an example","Find an opportunity","Use the tactic"]),"Guardian battle"];
}
