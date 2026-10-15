import {PAYMENTS_ENABLED,ACCOUNTS_ENABLED} from '../product';
import {publishMobileScreen, type MobileDestination} from './mobile/MobileGameShell';
import {worldRegions} from './regions';
import HeroPolygon from "./range/HeroPolygon";
import {heroConfig} from "./heroConfig";
import {saveSettings} from "../shared/storage/settingsStorage";
import {canAccess,trainingDemoAvailable} from './access';
import {weakTopics} from './personalLearning';
import PersonalTraining from './PersonalTraining';
import {PremiumOffer,ParentGate,SavePrompt,ParentProgress} from './ProductPanels';
import GameResult from "./GameResult";
import LearningFlow, { PathPanel } from "./challenges/Flow";
import { ensureLearning } from "./challenges/model";
import { personalExercise } from "./challenges/catalog";
import { recordAttempt } from "./challenges/progress";
import { worldKey } from "./accountStorage";
import HeroRoster from "./HeroRoster";
import ReviewMoment from "./ReviewMoment";
import UpgradeScene from "./UpgradeScene";
import { locationUnlocked, mistyUnlocked, nextLocation } from "./journey";

import HeroJournal, { type JournalTab } from "./HeroJournal";
import { restoreWorld } from "./storage";
import { character } from "./growth";
import { useEffect, useRef, useState } from "react";
import WorldMap from "./WorldMap";
import KingdomScene from "./KingdomScene";
import HeroSelectScreen from "../features/hero/HeroSelectScreen";
import Puzzle from "./Puzzle";
import ArenaGame, {
  ACTIVE_KEY,
  loadActive,
  opponentIds,
  levelDescriptions,
} from "./ArenaGame";
import { getCharacter } from "../entities/character/characters";
import { heroArt, territories, forSkill } from "./catalog";
import {
  applyAnalysis,
  completeChallenge,
  completeReview,
  loadWorld,
  persistWorld,
  saveGame,
  selectCharacter,
  castleDamage,
  upgradeName,
} from "./progress";
import { engineRequest } from "./engineClient";
import { emit } from "./events";
import type {
  Analysis,
  Challenge,
  GameRecord,
  HeroId,
  Skill,
  WorldSave,
} from "./types";
import "./world.css";
type Screen =
  | "activities"
  | "polygon"
  | "learning"
  | "upgrade"
  | "choose"
  | "map"
  | "territory"
  | "puzzle"
  | "reward"
  | "arena"
  | "game"
  | "result"
  | "review";
export default function WorldApp({
  initialChoose = false,
  initialHero,
  onAccount,
  onSelectHero,
  isGuest = false,
  onRegister, onPremium,
}: {
  initialChoose?: boolean;
  initialHero?: HeroId;
  onAccount?: () => void;
  onSelectHero?: (id: HeroId) => void;
  isGuest?: boolean;
  onRegister?:()=>void; onPremium?:()=>void;
}) {
  const [paywall,setPaywall]=useState(false),[savePrompt,setSavePrompt]=useState(false),[parent,setParent]=useState(false),[training,setTraining]=useState<{topic?:string;region?:string;mixed?:boolean;immediate?:boolean;demo?:boolean}|null>(null),[polygonMenu,setPolygonMenu]=useState(true);
  const [parentGate,setParentGate]=useState(false),[gateFeature,setGateFeature]=useState("training");
  function premiumGate(feature:string,level=1){if(canAccess(feature,level))return true;setGateFeature(feature);setParentGate(true);return false;}
  function train(topic?:string,mixed=false,immediate=false){emit("training_recommended",{topic,mixed});const demo=!mixed&&trainingDemoAvailable(saveRef.current);if(!demo&&!premiumGate(mixed?"misty":"training"))return;setTraining({topic,mixed,immediate,demo});}
  const [learningPractice, setLearningPractice] = useState(false);
  const [upgradeFrom, setUpgradeFrom] = useState(0);
  const [autoTravel, setAutoTravel] = useState<string | null>(null),
    [rangeAfterReward, setRangeAfterReward] = useState(false);
  const learningUpgrade = useRef(false);
  const [learningMode, setLearningMode] = useState<
    "path" | "mixed" | "calibration"
  >("path");
  const [calibrationDismissed, setCalibrationDismissed] = useState(false);
  const [upgradeHero, setUpgradeHero] = useState<HeroId>("inventor");
  const [upgradeReturn, setUpgradeReturn] = useState<Screen>("reward");
  const [journal, setJournal] = useState<JournalTab | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [serverSaved, setServerSaved] = useState(true);
  const [save, setSave] = useState(loadWorld),
    saveRef = useRef(save),
    [screen, setScreen] = useState<Screen>(() =>
      loadWorld().player.selectedCharacter ? "map" : "choose"
    ),
    [selectedHero, setSelectedHero] = useState<HeroId>("inventor"),
    [territory, setTerritory] = useState("fork"),
    [rewardFrom, setRewardFrom] = useState(0),
    [puzzle, setPuzzle] = useState<Challenge | null>(null),
    [active, setActive] = useState<GameRecord | null>(loadActive),
    [resultId, setResultId] = useState<string | null>(null),
    [level, setLevel] = useState(1),
    [color, setColor] = useState<"w" | "b">("w"),
    [analyzing, setAnalyzing] = useState(false),
    [analysisError, setAnalysisError] = useState(""),
    [storageError, setStorageError] = useState(false),
    [rewardPart, setRewardPart] = useState<string | null>(null);
  const hero = save.player.selectedCharacter || selectedHero,
    result = save.games.find((g) => g.id === resultId),
    place = territories.find((t) => t.id === territory)!;
  const learning = ensureLearning(save);
  const [chapterNotice,setChapterNotice]=useState(false);
  useEffect(()=>{if(!loaded||screen!=="map")return;const regions=worldRegions(save).filter(r=>r.open&&!learning.unlockedRegions?.includes(r.id));const completed=Object.values(learning.paths).every(p=>p.completed.length>=4);if(regions.length||(completed&&!learning.chapterOneSeen)){const n=structuredClone(saveRef.current),l=ensureLearning(n);l.unlockedRegions=[...new Set([...(l.unlockedRegions||[]),...regions.map(r=>r.id)])];for(const r of regions)emit("new_region_unlocked",{region:r.id});if(completed&&!l.chapterOneSeen){l.chapterOneSeen=true;setChapterNotice(true);}commit(n);}},[loaded,screen,save]);
  useEffect(() => {
    if (
      loaded &&
      screen === "map" &&
      (learning.experience || learning.calibrated) &&
      !saveRef.current.journey?.worldSeen
    ) {
      const next = structuredClone(saveRef.current);
      ensureLearning(next);
      next.journey!.worldSeen = true;
      commit(next);
      emit("world_first_view");
    }
  }, [loaded, screen, learning.experience, learning.calibrated]);
  useEffect(() => {
    if (
      loaded &&
      screen === "map" &&
      mistyUnlocked(save) &&
      !save.journey?.mistyRevealed
    ) {
      const next = structuredClone(saveRef.current);
      ensureLearning(next);
      next.journey!.mistyRevealed = true;
      commit(next);
      emit("misty_lands_unlocked");
    }
  }, [loaded, screen, save]);
  useEffect(()=>{if(!ACCOUNTS_ENABLED||!loaded||!isGuest||!['map','result'].includes(screen))return;const achievement=Object.values(save.learning?.paths||{}).reduce((n,p)=>n+p.completed.length,0);const games=save.games.filter(g=>g.reason!=='in-progress').length;const day=new Date().toDateString(),last=localStorage.getItem('chezzies-guest-day');localStorage.setItem('chezzies-guest-day',day);if((achievement>0||games>=2||(last&&last!==day))&&!sessionStorage.getItem('chezzies-save-prompt')){sessionStorage.setItem('chezzies-save-prompt','1');setSavePrompt(true);emit('save_progress_prompt_shown');}},[loaded,screen,isGuest,save]);
  function startPath(mode: "path" | "mixed" = "path", practice = false, skill = territory) {
    if (mode === "mixed") {if(mistyUnlocked(saveRef.current))train(undefined,true);return;}
    if((saveRef.current.learning?.paths[skill]?.completed.length||0)>=4){train(skill);return;}
    if(!premiumGate(skill))return;
    if(!locationUnlocked(saveRef.current,skill))return;
    setTerritory(skill);
    setLearningPractice(practice);
    chessAfterMini(
      "challenge_path_started"
    );
    setRewardFrom(castleDamage(saveRef.current, skill));
    setPuzzle(null);
    setRewardPart(null);
    setLearningMode(mode);
    setScreen("learning");
  }
  function commit(next: WorldSave) {
    saveRef.current = next;
    setSave(next);
    setStorageError(!persistWorld(next));
  }
  function chessAfterMini(action: string) {
    const pending = saveRef.current.miniGames?.pendingChess;
    if (!pending) return;
    emit("mini_game_to_chess_action", {
      ...pending,
      action,
      elapsedMs: Math.max(0, Date.now() - pending.at),
    });
    const next = structuredClone(saveRef.current);
    delete next.miniGames!.pendingChess;
    commit(next);
  }
  function travelToRange() {
    setAutoTravel("polygon");
    setScreen("map");
  }
  function claimUpgrade(test = false) {
    if (test) {
      const n = structuredClone(saveRef.current);
      n.miniGames ||= {};
      n.miniGames.pendingWeaponTest = {
        hero: upgradeHero,
        level: character(n, upgradeHero).equippedParts.length + 1,
        at: Date.now(),
      };
      commit(n);
    }
    if (result && upgradeReturn === "result") {
      const n = structuredClone(saveRef.current),
        g = n.games.find((g) => g.id === result.id);
      if (g?.rewards) g.rewards.upgradeClaimed = true;
      commit(n);
    }
    setRewardPart(null);
    if (test && saveRef.current.player.selectedCharacter !== upgradeHero) {
      commit(selectCharacter(saveRef.current, upgradeHero));
      onSelectHero?.(upgradeHero);
    }
    if (test && upgradeReturn === "reward") {
      setRangeAfterReward(true);
      setScreen("reward");
    } else if (test) travelToRange();
    else setScreen(upgradeReturn);
  }
  function commitLearning(next: WorldSave) {
    const before = character(saveRef.current).equippedParts.length;
    if (
      character(next).equippedParts.length > before &&
      !learningUpgrade.current
    ) {
      learningUpgrade.current = true;
      setUpgradeFrom(before);
      setUpgradeHero(hero);
    }
    commit(next);
  }
  function finishLearning(destination: Screen) {
    if (learningUpgrade.current) {
      learningUpgrade.current = false;
      setUpgradeReturn(destination);
      setScreen("upgrade");
    } else setScreen(destination);
  }
  function arrive(id: string) {
    if (!locationUnlocked(saveRef.current, id)) return;
    if(id!=="polygon"&&(saveRef.current.learning?.paths[id]?.completed.length||0)<4&&!premiumGate(id))return;
    emit("location_opened", { location: id });
    if (id === "polygon") emit("training_ground_opened");
    setAutoTravel(null);
    commit({
      ...saveRef.current,
      worldProgress: { ...saveRef.current.worldProgress, location: id },
    });
    if (id === "polygon") {
      setPolygonMenu(true);setScreen("polygon");
      return;
    }
    setTerritory(id);

    setScreen(id === "arena" ? "arena" : "territory");
  }
  function startChallenge(c: Challenge) {
    if((saveRef.current.learning?.paths[c.skill]?.completed.length||0)>=4){train(c.skill);return;}
    if(!locationUnlocked(saveRef.current,c.skill)||!premiumGate(c.skill))return;
    chessAfterMini("challenge_started");
    setRewardFrom(castleDamage(saveRef.current, c.skill));
    setPuzzle(c);
    emit("challenge_started", { challenge: c.id, skill: c.skill });
    setScreen("puzzle");
  }
  function wonChallenge(result = { attempts: 1, assisted: false }) {
    if (!puzzle) return;
    const previous = saveRef.current.characterProgress.unlockedUpgrades.length,
      next = completeChallenge(saveRef.current, puzzle, result);
    setUpgradeFrom(previous);
    setUpgradeHero(hero);
    commit(next);
    setRewardPart(
      next.characterProgress.unlockedUpgrades.length > previous
        ? upgradeName(next, previous)
        : null
    );
  }
  function startGame() {
    if(!premiumGate("arena",level))return;
    chessAfterMini("game_started");
    if (active) {
      setScreen("game");
      return;
    }
    const g: GameRecord = {
      id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      result: "quit",
      characterId: hero,
      reason: "in-progress",
      opponent: opponentIds[level - 1],
      level,
      playerColor: color,
      duration: 0,
      moves: [],
    };
    setActive(g);
    emit("game_started", { id: g.id, level, opponent: g.opponent });
    setScreen("game");
  }
  function finishGame(g: GameRecord) {
    const previous = saveRef.current.characterProgress.unlockedUpgrades.length,
      next = saveGame(saveRef.current, g);
    commit(next);
    setRewardPart(
      next.characterProgress.unlockedUpgrades.length > previous
        ? upgradeName(next, previous)
        : null
    );
    localStorage.removeItem(worldKey(ACTIVE_KEY));
    setActive(null);
    setResultId(g.id);
    setScreen("result");
  }
  async function analyze() {
    if (!result || result.analysis || analyzing) return;
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const analysis = await engineRequest<Analysis>({
        type: "analysis",
        game: result,
      });
      const before = character(saveRef.current).unlockedParts.length;
      const next = applyAnalysis(saveRef.current, result.id, analysis);
      commit(next);
      if (character(next).unlockedParts.length > before)
        setRewardPart(upgradeName(next, before));
    } catch {
      setAnalysisError("The review did not finish. You can try again.");
    } finally {
      setAnalyzing(false);
    }
  }
  useEffect(() => {
    let live = true;
    const restart = (event: StorageEvent) => {
      if (event.key !== worldKey("gosha-world-v1") || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue);
        if ((next.restartedAt || 0) > (saveRef.current.restartedAt || 0))
          window.location.assign("/");
      } catch {
        /* Ignore unrelated malformed storage writes. */
      }
    };
    window.addEventListener("storage", restart);
    const handler = (e: Event) => setServerSaved((e as CustomEvent).detail);
    window.addEventListener("world-save-status", handler);
    void restoreWorld(saveRef.current).then((s) => {
      if (!live) return;
      if (!s.player.selectedCharacter && initialHero && !s.restartedAt) {
        s = selectCharacter(s, initialHero);
        persistWorld(s);
      }
      if(s.settings)saveSettings(s.settings);
      if(!isGuest && s.player.selectedCharacter){const l=ensureLearning(s);s.journey!.onboardingSeen=true;l.calibrated=true;persistWorld(s);}
      saveRef.current = s;
      setSave(s);
      setScreen(
        initialChoose || !s.player.selectedCharacter ? "choose" : "map"
      );
      setLoaded(true);
    });
    return () => {
      live = false;
      window.removeEventListener("storage", restart);
      window.removeEventListener("world-save-status", handler);
    };
  }, []);
  useEffect(() => {
    if (screen === "result" && result && !result.analysis) void analyze();
  }, [screen, resultId]);
  useEffect(()=>{const changed=()=>{if(loaded)commit(structuredClone(saveRef.current));};window.addEventListener("chezzies-settings-change",changed);return()=>window.removeEventListener("chezzies-settings-change",changed);},[loaded]);
  async function retryProfileSave(){const next=await restoreWorld(saveRef.current);commit(next);}
  useEffect(()=>{if(!loaded||isGuest)return;const online=()=>{void retryProfileSave();};window.addEventListener("online",online);return()=>window.removeEventListener("online",online);},[loaded,isGuest]);
  const back = () => setScreen("map");
  useEffect(()=>{
    if(!loaded)return;
    const go=(destination:MobileDestination)=>{
      if(destination==='account'){onAccount?.();return;}
      if(!saveRef.current.player.selectedCharacter){setScreen('choose');return;}
      setJournal(null);setTraining(null);setParent(false);setParentGate(false);setPaywall(false);setSavePrompt(false);
      if(destination==='hero'){setJournal('hero');return;}
      if(destination==='skills'||destination==='trophies'){setJournal(destination);return;}
      if(destination==='parent'){if(ACCOUNTS_ENABLED&&isGuest){onRegister?.();return;}if(premiumGate('parent'))setParent(true);return;}
      if(destination==='polygon'){setPolygonMenu(true);setScreen('polygon');return;}
      if(destination==='play'){setScreen('activities');return;}
      setScreen('map');
      if(destination==='help')setTimeout(()=>window.dispatchEvent(new Event('chezzies-show-tour')),100);
    };
    const listener=(e:Event)=>go((e as CustomEvent<MobileDestination>).detail);
    window.addEventListener('chezzies-mobile-go',listener);
    const pending=sessionStorage.getItem('chezzies-mobile-destination') as MobileDestination|null;
    if(pending){sessionStorage.removeItem('chezzies-mobile-destination');go(pending);}
    return()=>window.removeEventListener('chezzies-mobile-go',listener);
  },[loaded,isGuest]);
  useEffect(()=>{
    const tab=parent?'account':journal==='hero'||screen==='choose'?'hero':journal?'skills':screen==='map'&&!training?'map':'play';
    const title=parent?"Child’s progress":journal==='hero'?"My hero":journal?"Skills":training?"Practice":screen==='map'?'CHEZZIES':screen==='arena'||screen==='game'?"Arena":screen==='polygon'?"Training ground":screen==='choose'?"Choose your hero":screen==='activities'?"Play":place?.name||"Adventure";
    publishMobileScreen(tab,title);
  },[screen,journal,parent,training,loaded,place]);
  const remaining = forSkill(territory).filter(
    (c) => !save.worldProgress.completedChallenges.includes(c.id)
  );
  let content;
  if (
    loaded &&
    save.player.selectedCharacter &&
    !learning.calibrated &&
    !learning.experience &&
    !calibrationDismissed &&
    screen !== "choose" &&
    screen !== "upgrade"
  )
    content = (
      <LearningFlow
        save={save}
        mode="calibration"
        onSave={commitLearning}
        onBack={() => {
          setCalibrationDismissed(true);
          finishLearning("map");
        }}
        onChapter={back}
        isGuest={isGuest}
      />
    );
  else if(screen==='activities') content=<main className="activity-shell mobile-play-hub"><h1>Where shall we go?</h1><button className="world-button" onClick={()=>{const id=nextLocation(save);arrive(id);}}>Continue the adventure →</button><button onClick={()=>setScreen('arena')}>⚔ Opponents Arena</button><button onClick={()=>{setPolygonMenu(true);setScreen('polygon');}}>◎ Hero training ground</button></main>;
  else if (screen === "polygon" && polygonMenu) content=(<main className="activity-shell"><h1>Hero training ground</h1><div className="polygon-choices"><section className="polygon-choice"><span>{hero==='mage'?'⚡':hero==='inventor'?'◎':'🎯'}</span><h2>Try your hero</h2><p>Test your weapon and new improvements. Set a record in 60 seconds.</p>{save.miniGames?.pendingWeaponTest?.hero===hero&&<p className="new-upgrade-note">New improvement: {heroConfig[hero].upgrades[save.miniGames.pendingWeaponTest.level-1]}</p>}<button className="world-button" onClick={()=>setPolygonMenu(false)}>Try your hero →</button></section><section className="polygon-choice"><span>♟</span><h2>{!canAccess('training')&&!trainingDemoAvailable(save)?'🔒 ':''}Practise skills</h2><p>5 short chess puzzles on topics worth revisiting now.</p><p>{weakTopics(save).length?"Today’s suggestion: "+weakTopics(save).map(k=>territories.find(t=>t.id===k)?.short).join(', '):(save.learning?.attempts.some(a=>!a.scaffolding)||Object.values(save.learning?.paths||{}).some(p=>p.completed.length)?"Mixed practice — 5 puzzles from familiar topics":"Explore a tactic in its fortress first, then practise it here")}</p><p>5 puzzles · about 3 minutes</p>{!canAccess('training')&&<small>{trainingDemoAvailable(save)?"One free practice series. Then available in the full version.":"Personal challenges are available in the full version"}</small>}<button className="world-button" onClick={()=>train(weakTopics(save)[0],false,true)}>{canAccess('training')?"Practise skills →":trainingDemoAvailable(save)?"Try it free":"Open personal practice"}</button></section></div><button onClick={back}>← World map</button></main>);
  else if (screen === "polygon")
    content = (
      <HeroPolygon
        save={save}
        onSave={commit}
        onLobby={()=>setPolygonMenu(true)}
        onMap={back}
        onOfficer={() => {
          commit(selectCharacter(saveRef.current, "knight"));
          onSelectHero?.("knight");
        }}
        onChess={() => {
          const skill=nextLocation(saveRef.current);
          startPath('path',false,skill==='arena'?'fork':skill);
        }}
      />
    );
  else if (screen === "learning")
    content = (
      <LearningFlow
        save={save}
        skill={territory}
        mode={learningMode}
        practice={learningPractice}
        isGuest={isGuest}
        onSave={commitLearning}
        onBack={() => finishLearning("map")}
        onChapter={() => finishLearning("reward")}
      />
    );
  else if (screen === "choose" && save.player.selectedCharacter)
    content = (
      <HeroRoster
        save={save}
        onBack={back}
        onSelect={(id) => {
          commit(selectCharacter(saveRef.current, id));
          onSelectHero?.(id);
          setScreen("map");
        }}
      />
    );
  else if (screen === "choose")
    content = (
      <HeroSelectScreen
        localOnly
        onHeroSelected={(id) => {
          if (!id) return;
          commit(selectCharacter(saveRef.current, id as HeroId));
          emit("hero_selected", { hero: id });
          onSelectHero?.(id as HeroId);
          setScreen("map");
        }}
      />
    );
  else if (screen === "map")
    content = (
      <>
        {active && (
          <div className="resume-ribbon">
            Your game is waiting.{" "}
            <button onClick={() => setScreen("game")}>Continue →</button>
          </div>
        )}
        <WorldMap
          onParent={()=>{if(ACCOUNTS_ENABLED&&isGuest){onRegister?.();return;}if(premiumGate("parent")){emit("parent_progress_viewed");setParent(true);}}}
          onTraining={topic=>train(topic)}
          onTourDone={() => {
            const n = structuredClone(saveRef.current);
            ensureLearning(n);
            n.journey!.onboardingSeen = true;
            commit(n);
          }}
          autoTravelTo={autoTravel}
          save={save}
          onArrive={arrive}
          onHero={setJournal}
          onChangeHero={() => setScreen("choose")}
          onAccount={onAccount}
          onRegion={id=>{const r=worldRegions(saveRef.current).find(x=>x.id===id);if(r?.open&&premiumGate("misty")){emit("mastery_challenge_started",{region:id});setTraining({region:id,mixed:true});}}}
          onMixed={() => {
            if (!mistyUnlocked(saveRef.current)) return;
            emit("misty_lands_opened");
            train(undefined,true);
          }}
          onReview={() => {
            const g = [...save.games]
              .reverse()
              .find((g) => g.analysis?.review && !g.reviewCompleted);
            if (g) {
              chessAfterMini("personal_review_opened");
              setResultId(g.id);
              setScreen("review");
            }
          }}
        />
      </>
    );
  else if (screen === "upgrade")
    content = (
      <UpgradeScene
        hero={upgradeHero}
        fromParts={upgradeFrom}
        toParts={character(save, upgradeHero).equippedParts.length}
        onDone={() => claimUpgrade()}
        onTest={() => claimUpgrade(true)}
      />
    );
  else if (screen === "game" && active)
    content = (
      <ArenaGame
        isGuest={isGuest}
        game={active}
        strength={save.adaptiveOpponent.currentStrength}
        onFinish={finishGame}
        onPause={() => {
          setActive(loadActive());
          back();
        }}
      />
    );
  else if (screen === "puzzle" && puzzle)
    content = (
      <Puzzle
        isGuest={isGuest}
        key={puzzle.id}
        puzzle={puzzle}
        save={save}
        onComplete={wonChallenge}
        onBack={(solved) => {
          if (solved && rewardPart) {
            setUpgradeReturn("reward");
            setScreen("upgrade");
          } else setScreen(solved ? "reward" : "territory");
        }}
      />
    );
  else if (screen === "review" && result?.analysis?.review)
    content = (
      <ReviewMoment
        onAttempt={(a) => {
          const c = personalExercise(result!);
          if (c) commit(recordAttempt(saveRef.current, c, a));
        }}
        isGuest={isGuest}
        key={result.id}
        game={result}
        save={save}
        onComplete={() => {
          const id = result.characterId || hero,
            previous = character(saveRef.current, id).equippedParts.length;
          const next = completeReview(saveRef.current, result.id);
          commit(next);
          if (character(next, id).equippedParts.length > previous) {
            setUpgradeFrom(previous);
            setUpgradeHero(id);
            setRewardPart("Power-up");
          }
        }}
        onBack={() => {
          if (rewardPart) {
            setUpgradeReturn("result");
            setScreen("upgrade");
          } else back();
        }}
      />
    );
  else if (screen === "reward" || screen === "territory")
    content = (
      <KingdomScene
        onSettled={
          rangeAfterReward
            ? () => {
                setRangeAfterReward(false);
                travelToRange();
              }
            : undefined
        }
        key={screen + (puzzle?.id || "")}
        hero={hero}
        skill={territory as Skill}
        save={save}
        onChallenge={startChallenge}
        onBack={() => {
          if (rangeAfterReward) {
            setRangeAfterReward(false);
            travelToRange();
          } else back();
        }}
        onContinue={() => startPath("path")}
        reward={screen === "reward"}
        rewardFrom={rewardFrom}
        rewardPart={rewardPart}
        pathPanel={
          <PathPanel
            save={save}
            skill={territory}
            onStart={(practice) => startPath("path", practice)}
            onMixed={() => startPath("mixed")}
            onPersonal={(id) => {
              chessAfterMini("personal_review_opened");
              setResultId(id);
              setScreen("review");
            }}
          />
        }
      />
    );
  else if (screen === "arena")
    content = (
      <main className="activity-shell arena-setup">
        <button className="text-button" onClick={back}>
          ← World map
        </button>
        <p className="eyebrow">DISCOVERIES BECOME STRENGTH</p>
        <h1>Opponents Arena</h1>
        <p>
          Try what you have learned. After the game, explore a useful moment.
        </p>
        <div className="opponent-lineup">
          {opponentIds.map((id, i) => {
            const o = getCharacter(id)!;
            return (
              <button
                key={id}
                className={level === i + 1 ? "selected" : ""}
                onClick={() => setLevel(i + 1)}
              >
                <img src={o.avatar} alt="" />
                <span className="opponent-stars">{"★".repeat(i + 1)}</span>
                <strong>{o.name}</strong>
                <small>{levelDescriptions[i]}</small>
                <span className="opponent-history">
                  {save.games.filter((g) => g.opponent === id).length} games ·{" "}
                  {
                    save.games.filter(
                      (g) => g.opponent === id && g.result === "win"
                    ).length
                  }{" "}
                  wins
                </span>
              </button>
            );
          })}
        </div>
        {level === 5 && (
          <p className="rival-note">
            King Nexus remembers your games. You grow together.{" "}
            {save.adaptiveOpponent.gamesPlayed > 0
              ? `Games played so far: ${save.adaptiveOpponent.gamesPlayed}.`
              : ""}
          </p>
        )}
        <div className="side-choice">
          <span>Your pieces</span>
          <button
            aria-pressed={color === "w"}
            className={color === "w" ? "selected" : ""}
            onClick={() => setColor("w")}
          >
            ♔ White
          </button>
          <button
            aria-pressed={color === "b"}
            className={color === "b" ? "selected" : ""}
            onClick={() => setColor("b")}
          >
            ♚ Black
          </button>
        </div>
        {active && <p>You have a saved game. Continue it first.</p>}
        <button className="world-button" onClick={startGame}>
          {active ? "Continue game" : "Start game"} →
        </button>
      </main>
    );
  else if (screen === "result" && result)
    content = (
      <GameResult
        game={result}
        save={save}
        analyzing={analyzing}
        error={analysisError}
        onRetry={analyze}
        onReview={() => {
          chessAfterMini("personal_review_opened");
          emit("post_game_review_opened", { game: result.id });
          setRewardPart(null);
          setScreen("review");
        }}
        onUpgrade={() => {
          setUpgradeFrom(result.rewards!.fromParts);
          setUpgradeHero(result.characterId || hero);
          setUpgradeReturn("result");
          setScreen("upgrade");
        }}
        onBack={back}
        onTrain={() => {
          const proposed=save.recommendation?.skill||'fork';
          const skill=locationUnlocked(save,proposed)?proposed:nextLocation(save);
          startPath('path',false,skill==='arena'?'fork':skill);
        }}
      />
    );
  else content = <button onClick={back}>Return to the map</button>;
  if (!loaded)
    return (
      <div className="world-loading">Opening your adventure book…</div>
    );
  return (
    <div className="gosha-world">
      {storageError && (
        <div className="storage-warning" role="alert">
          Your browser could not save progress. Free up space to keep your discoveries.
        </div>
      )}
      {!serverSaved && (
        <div className="save-status" role="status">
          Progress is in this browser for now. We will check your profile save when the connection returns.
          <button onClick={()=>void retryProfileSave()}>Retry</button>
        </div>
      )}
      {chapterNotice&&<div className="world-modal"><section className="activity-shell"><h1>First chapter complete!</h1><p>Five fortresses freed. Beyond the mist, Tactics Pass has opened: new positions and longer continuations.</p><button className="world-button" onClick={()=>setChapterNotice(false)}>See the new path →</button></section></div>}
      {training ? <PersonalTraining key={`${training.topic || "all"}-${!!training.mixed}`} save={save} {...training} onSave={commit} onBack={()=>setTraining(null)} onTrain={topic=>train(topic,false,true)}/> : content}
      {PAYMENTS_ENABLED&&parentGate&&<ParentGate onBack={()=>setParentGate(false)} onAdult={()=>{setParentGate(false);emit("premium_paywall_viewed",{feature:gateFeature});setPaywall(true);}}/>}
      {PAYMENTS_ENABLED&&paywall&&<PremiumOffer training={gateFeature==="training"} onClose={()=>setPaywall(false)} onOpen={()=>{setPaywall(false);if(isGuest){sessionStorage.setItem("chezzies-premium-intent","1");onRegister?.();}else onPremium?.();}}/>}
      {ACCOUNTS_ENABLED&&savePrompt&&<SavePrompt arena={save.games.length>=2} onSave={()=>{setSavePrompt(false);emit("registration_started");onRegister?.();}} onSkip={()=>{setSavePrompt(false);emit("save_progress_prompt_skipped");}}/>}
      {parent&&<ParentProgress save={save} onBack={()=>setParent(false)}/>}
      {journal && (
        <HeroJournal
          key={journal}
          save={save}
          initial={journal}
          onClose={() => setJournal(null)}
          onHeroes={() => {
            setJournal(null);
            setSelectedHero(hero);
            setScreen("choose");
          }}
        />
      )}
    </div>
  );
}
