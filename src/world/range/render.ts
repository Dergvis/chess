// Heraldic shields and physical rocket effects share the current range model.
import type { RangeModel, Point, TargetKind } from "./model";
const circle = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
) => {
  c.beginPath();
  c.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
};
function outline(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  c.moveTo(-r * 0.86, -r * 0.8);
  c.quadraticCurveTo(0, -r * 0.58, r * 0.86, -r * 0.8);
  c.lineTo(r * 0.78, r * 0.15);
  c.quadraticCurveTo(r * 0.55, r * 0.73, 0, r * 1.06);
  c.quadraticCurveTo(-r * 0.55, r * 0.73, -r * 0.78, r * 0.15);
  c.closePath();
}
function shield(
  c: CanvasRenderingContext2D,
  r: number,
  kind: TargetKind,
  cracked = false,
  flash = false
) {
  const armor = kind === "armor",
    gold = kind === "gold";
  c.shadowColor = "#061c29aa";
  c.shadowBlur = 10;
  c.shadowOffsetY = 6;
  outline(c, r);
  const metal = c.createLinearGradient(-r, -r, r, r);
  metal.addColorStop(
    0,
    flash ? "#fffde1" : gold ? "#fff0a2" : armor ? "#b8c8c8" : "#ecd09a"
  );
  metal.addColorStop(0.5, gold ? "#c98521" : armor ? "#49616b" : "#aa7737");
  metal.addColorStop(1, gold ? "#ffe095" : armor ? "#203a48" : "#f0ce80");
  c.fillStyle = metal;
  c.fill();
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
  c.lineWidth = 1.5;
  c.strokeStyle = "#fff0bd";
  c.stroke();
  outline(c, r * 0.79);
  const enamel = c.createLinearGradient(0, -r, 0, r);
  enamel.addColorStop(
    0,
    flash
      ? "#fff6ba"
      : kind === "double"
      ? "#b46548"
      : kind === "swift"
      ? "#57a7b3"
      : armor
      ? "#52717f"
      : gold
      ? "#fbda63"
      : "#327478"
  );
  enamel.addColorStop(
    1,
    kind === "double"
      ? "#552b30"
      : kind === "swift"
      ? "#174f69"
      : armor
      ? "#142c3d"
      : gold
      ? "#a36710"
      : "#123d49"
  );
  c.fillStyle = enamel;
  c.fill();
  c.strokeStyle = "#533d25";
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = gold ? "#fff6c8" : "#f0d797";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `${Math.round(r * 1.12)}px Georgia,serif`;
  c.fillText(
    gold ? "☀" : armor ? "♜" : kind === "swift" ? "ϟ" : "♞",
    0,
    -r * 0.04
  );
  if (armor) {
    c.strokeStyle = "#bbc5bb";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-r * 0.61, -r * 0.24);
    c.lineTo(r * 0.61, -r * 0.24);
    c.stroke();
  }
  for (const [x, y] of [
    [-0.69, -0.58],
    [0.69, -0.58],
    [0, 0.8],
  ]) {
    circle(c, r * x, r * y, 2);
    c.fillStyle = "#fff0bd";
    c.fill();
  }
  if (cracked) {
    c.beginPath();
    c.moveTo(-r * 0.13, -r * 0.7);
    c.lineTo(r * 0.14, -r * 0.2);
    c.lineTo(-r * 0.18, r * 0.1);
    c.lineTo(r * 0.12, r * 0.62);
    c.strokeStyle = "#fff0b0";
    c.lineWidth = 3;
    c.stroke();
  }
}
export function drawRange(
  c: CanvasRenderingContext2D,
  m: RangeModel,
  origin: Point
) {
  c.clearRect(0, 0, m.width, m.height);
  const groups = [...new Set(m.targets.map((t) => t.group).filter(Boolean))];
  for (const group of groups) {
    const a = m.targets.filter((t) => t.group === group);
    if (a.length < 2) continue;
    c.save();
    c.setLineDash([3, 7]);
    c.strokeStyle = "#eedca458";
    c.lineWidth = 1;
    c.beginPath();
    a.forEach((t, i) => (i ? c.lineTo(t.x, t.y) : c.moveTo(t.x, t.y)));
    c.stroke();
    c.restore();
  }
  for (const t of m.targets) {
    c.save();
    const age = m.time - (t.born ?? -1),
      enter = Math.min(1, age / 0.3);
    c.globalAlpha =
      Math.min(1, enter) *
      (t.expires ? Math.min(1, (t.expires - m.time) / 0.7) : 1);
    c.translate(t.x, t.y + (1 - enter) * 18);
    c.rotate(
      t.hit
        ? Math.sin(t.hit * 75) * 0.12
        : Math.sin(m.time * 1.4 + t.id) * 0.025
    );
    if (t.kind === "gold") {
      circle(c, 0, 0, t.r * 1.5);
      c.fillStyle = "#ffe47420";
      c.fill();
    }
    shield(c, t.r, t.kind, t.kind === "armor" && t.hp === 1, t.hit > 0);
    c.restore();
  }
  if (!m.finished) {
    c.save();
    if (m.level >= 2) {
      c.setLineDash([3, 9]);
      c.strokeStyle = "#ffe9a15c";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(origin.x, origin.y);
      c.lineTo(m.aim.x, m.aim.y);
      c.stroke();
      c.setLineDash([]);
    }
    if (m.level >= 3) {
      circle(c, m.aim.x, m.aim.y, m.radius);
      c.fillStyle = "#ffd4660c";
      c.fill();
      c.strokeStyle = "#ffe0a480";
      c.lineWidth = 1;
      c.stroke();
    }
    c.strokeStyle = "#fff1c2";
    c.lineWidth = 2;
    circle(c, m.aim.x, m.aim.y, m.level >= 2 ? 10 : 4);
    c.stroke();
    if (m.level >= 2)
      for (const d of [-1, 1]) {
        c.beginPath();
        c.moveTo(m.aim.x + d * 15, m.aim.y);
        c.lineTo(m.aim.x + d * 24, m.aim.y);
        c.moveTo(m.aim.x, m.aim.y + d * 15);
        c.lineTo(m.aim.x, m.aim.y + d * 24);
        c.stroke();
      }
    c.restore();
  }
  if (m.phase === "charge" || m.phase === "fire") {
    const power =
        m.phase === "fire" ? 1 : Math.min(1, m.phaseTime / m.config.charge),
      size = (16 + m.level * 8) * power + 2;
    const g = c.createRadialGradient(
      origin.x,
      origin.y,
      0,
      origin.x,
      origin.y,
      size
    );
    g.addColorStop(0, "#fffef5");
    g.addColorStop(0.25, "#ffda78ee");
    g.addColorStop(1, "#ff6a0000");
    circle(c, origin.x, origin.y, size);
    c.fillStyle = g;
    c.fill();
    if (m.level === 5) {
      c.save();
      c.translate(origin.x, origin.y);
      c.rotate(m.time * 2);
      c.strokeStyle = "#ffe494b0";
      c.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        c.rotate(Math.PI / 4);
        c.beginPath();
        c.moveTo(size * 0.5, 0);
        c.lineTo(size * 1.4, 0);
        c.stroke();
      }
      c.restore();
    }
  }
  if (m.rocket) {
    const r = m.rocket;
    for (let i = 0; i < r.trail.length; i++) {
      const p = r.trail[i],
        f = i / r.trail.length;
      circle(c, p.x, p.y, (1 - f) * (9 + m.level * 3) * m.scale + 2);
      c.fillStyle = `rgba(206,190,160,${f * 0.38})`;
      c.fill();
    }
    c.save();
    c.translate(r.position.x, r.position.y);
    c.rotate(Math.atan2(r.to.y - r.from.y, r.to.x - r.from.x));
    const size =
      [1, 1.08, 1.4, 1.65, 2.05][m.level - 1] * Math.max(0.75, m.scale);
    c.scale(size, size);
    c.shadowBlur = m.level === 5 ? 24 : 10;
    c.shadowColor = "#ffd271";
    c.fillStyle = "#fa8f29";
    c.beginPath();
    c.moveTo(-8, -5);
    c.lineTo(-33 - (Math.sin(m.time * 80) + 1) * 7, 0);
    c.lineTo(-8, 5);
    c.fill();
    c.fillStyle = "#fff6c5";
    c.beginPath();
    c.moveTo(-10, -2);
    c.lineTo(-25, 0);
    c.lineTo(-10, 2);
    c.fill();
    c.beginPath();
    c.moveTo(15, 0);
    c.lineTo(4, -6);
    c.lineTo(-10, -6);
    c.lineTo(-13, 6);
    c.lineTo(4, 6);
    c.closePath();
    const body = c.createLinearGradient(0, -6, 0, 6);
    body.addColorStop(0, "#fff3bc");
    body.addColorStop(0.4, m.level === 5 ? "#ffd05d" : "#c4bda6");
    body.addColorStop(1, "#755128");
    c.fillStyle = body;
    c.fill();
    c.strokeStyle = "#674725";
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = m.level === 5 ? "#fff4a4" : "#b57d3b";
    c.fillRect(-7, -6, 4, 12);
    if (m.level >= 4) {
      c.strokeStyle = "#fff2a6";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-6, 0);
      c.lineTo(7, 0);
      c.stroke();
    }
    c.restore();
  }
  for (const b of m.bursts) {
    const f = Math.min(1, b.age / 1.15),
      rad = b.radius * Math.min(1, b.age / 0.16);
    c.save();
    c.globalAlpha = 1 - f;
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4,
        d = b.radius * (0.3 + f * 0.8);
      circle(
        c,
        b.x + Math.cos(a) * d,
        b.y + Math.sin(a) * d - f * 18,
        b.radius * (0.16 + f * 0.24)
      );
      c.fillStyle = "#aa8b6350";
      c.fill();
    }
    const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(1, rad));
    g.addColorStop(0, "#fffbea");
    g.addColorStop(0.2, m.level === 5 ? "#fff1a1" : "#ffd789");
    g.addColorStop(0.55, "#ffa537b0");
    g.addColorStop(1, "#e45d0900");
    circle(c, b.x, b.y, rad);
    c.fillStyle = g;
    c.fill();
    circle(c, b.x, b.y, rad * (1 + f * 0.5));
    c.strokeStyle = "#fff0ac";
    c.lineWidth = (m.level >= 4 ? 4 : 2) * (1 - f);
    c.stroke();
    if (m.level === 5) {
      circle(c, b.x, b.y, rad * (0.7 + f));
      c.strokeStyle = "#ffce6260";
      c.stroke();
    }
    for (const [j, t] of (b.fragments || []).entries())
      for (let k = 0; k < 3; k++) {
        const a = j * 1.8 + k * 2.1;
        c.save();
        c.translate(
          t.x + Math.cos(a) * f * 60,
          t.y + Math.sin(a) * f * 40 + f * f * 35
        );
        c.rotate(a + f * 4);
        c.fillStyle = k % 2 ? "#edcd83" : "#3f6871";
        c.fillRect(-4, -6, 8 * (1 - f), 12 * (1 - f));
        c.restore();
      }
    for (let i = 0; i < 10 + m.level * 3; i++) {
      const a = i * 2.4,
        x = b.x + Math.cos(a) * rad * f * 1.5,
        y = b.y + Math.sin(a) * rad * f * 1.5;
      c.fillStyle = i % 2 ? "#c49b62" : "#fff1b1";
      c.fillRect(x, y, 3 * (1 - f) + 1, 3 * (1 - f) + 1);
    }
    c.textAlign = "center";
    c.shadowColor = "#243330";
    c.shadowBlur = 6;
    if ((b.kills || 0) >= 2) {
      c.font = `900 ${Math.max(29, 40 * m.scale)}px sans-serif`;
      c.fillStyle = "#fff5ce";
      c.fillText("💥 ×" + b.kills, b.x, b.y - 25 - b.age * 24);
    } else if (b.score) {
      c.font = "bold 21px sans-serif";
      c.fillStyle = "#fff0be";
      c.fillText("+" + b.score, b.x, b.y - 22 - b.age * 32);
    }
    c.restore();
  }
}
