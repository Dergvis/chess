import {
  actorImage,
  weaponTier,
  weaponOrigins,
  eyeOrigins,
  upgradedHeroes,
} from "./weapons";
import type { CSSProperties } from "react";
import type { HeroId } from "./types";
import { heroArt } from "./catalog";
export const actors = {
  inventor: {
    src: "/world-art/laserhorse.png",
    origin: [0.768, 0.284],
    ratio: 1068 / 1440,
    legs: [
      "polygon(50% 60%,67% 60%,71% 100%,52% 100%)",
      "polygon(71% 58%,90% 58%,94% 100%,71% 100%)",
      "polygon(19% 68%,35% 68%,36% 100%,18% 100%)",
      "polygon(34% 68%,50% 68%,53% 100%,33% 100%)",
    ],
  },
  mage: {
    src: "/world-art/ladiator.png",
    origin: [0.345, 0.117],
    ratio: 1068 / 1440,
    legs: [
      "polygon(25% 72%,52% 72%,54% 100%,24% 100%)",
      "polygon(54% 72%,81% 72%,84% 100%,53% 100%)",
    ],
  },
  knight: {
    src: "/world-art/officer.png",
    origin: [0.927, 0.088],
    ratio: 1068 / 1440,
    legs: [
      "polygon(12% 64%,40% 64%,43% 100%,10% 100%)",
      "polygon(40% 64%,65% 64%,72% 100%,40% 100%)",
    ],
  },
} as const;
export default function HeroActor({
  id,
  moving = false,
  attacking = false,
  celebrating = false,
  facing = 1,
  parts = 0,
  aimingAngle,
}: {
  id: HeroId;
  moving?: boolean;
  attacking?: boolean;
  celebrating?: boolean;
  facing?: number;
  parts?: number;
  aimingAngle?: number;
}) {
  const tier = weaponTier(parts),
    base = actors[id];
  const art = {
    ...base,
    src: upgradedHeroes.includes(id)
      ? actorImage(id, parts, attacking)
      : base.src,
    origin: weaponOrigins[id][tier - 1],
    ratio: id === "knight" && tier > 1 ? 1080 / 1456 : 1086 / 1448,
  };
  const spriteStyle: CSSProperties =
    upgradedHeroes.includes(id) &&
    (tier > 1 || (id === "inventor" && attacking))
      ? {
          maskImage: "url(" + art.src.replace(".png", "-mask.svg") + ")",
          maskSize: "100% 100%",
          WebkitMaskImage: "url(" + art.src.replace(".png", "-mask.svg") + ")",
          WebkitMaskSize: "100% 100%",
        }
      : {};
  const raisingScepter = id === "mage" && attacking;
  const turningHead = id === "inventor" && attacking;
  const aimingOfficer = id === "knight" && aimingAngle !== undefined;
  const [ex, ey, fx, fy] = eyeOrigins[tier - 1];
  const anchors =
    id === "inventor" ? (
      <>
        <i
          className="weapon-anchor eye-anchor eye-near"
          style={{ left: ex * 100 + "%", top: ey * 100 + "%" }}
        />
        <i
          className="weapon-anchor eye-anchor eye-far"
          style={{ left: fx * 100 + "%", top: fy * 100 + "%" }}
        />
      </>
    ) : (
      <i
        className="weapon-anchor"
        style={{
          left: art.origin[0] * 100 + "%",
          top: art.origin[1] * 100 + "%",
        }}
      />
    );
  return (
    <div
      className={
        "hero-actor hero-" +
        id +
        (moving ? " is-travelling" : "") +
        (attacking ? " is-attacking" : "") +
        (celebrating ? " is-celebrating" : "")
      }
      data-hero-type={id}
      data-weapon-level={tier}
      style={
        { "--actor-ratio": art.ratio, "--facing": facing } as CSSProperties
      }
      aria-label={heroArt[id].name}
    >
      <div className="actor-shadow" />
      <div className="actor-facing" data-facing={facing}>
        <div className="actor-rig">
          <img
            className={
              "actor-body " +
              (raisingScepter
                ? "mage-body-split"
                : turningHead
                ? "horse-body-split"
                : aimingOfficer
                ? "officer-body-split"
                : "")
            }
            style={spriteStyle}
            src={art.src}
            alt=""
            draggable={false}
          />
          {moving &&
            art.legs.map((clip, i) => (
              <img
                key={i}
                className={"actor-leg actor-leg-" + i}
                src={art.src}
                alt=""
                draggable={false}
                style={
                  {
                    ...spriteStyle,
                    clipPath: clip,
                    "--leg-phase":
                      id === "inventor"
                        ? i === 0 || i === 3
                          ? "0s"
                          : "-.25s"
                        : i % 2
                        ? "-.3s"
                        : "0s",
                  } as CSSProperties
                }
              />
            ))}
          {aimingOfficer ? (
            <div
              className="officer-aim-rig"
              style={{ "--aim-angle": aimingAngle + "deg" } as CSSProperties}
            >
              <img src={art.src} style={spriteStyle} alt="" draggable={false} />
              {anchors}
              {tier >= 4 && (
                <span
                  className="weapon-idle-energy energy-knight"
                  style={{
                    left: art.origin[0] * 100 + "%",
                    top: art.origin[1] * 100 + "%",
                  }}
                />
              )}
            </div>
          ) : raisingScepter ? (
            <div className="scepter-arm">
              <img src={art.src} style={spriteStyle} alt="" />
              {anchors}
            </div>
          ) : turningHead ? (
            <div className="horse-head-rig">
              <img src={art.src} style={spriteStyle} alt="" />
              {anchors}
            </div>
          ) : (
            anchors
          )}
          {tier >= 4 && !aimingOfficer && (
            <span
              className={"weapon-idle-energy energy-" + id}
              style={{
                left: art.origin[0] * 100 + "%",
                top: art.origin[1] * 100 + "%",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
