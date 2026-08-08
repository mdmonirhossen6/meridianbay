"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/store/gameStore";
import { worldApi } from "@/lib/worldApi";
import { copPositions } from "@/components/systems/WantedSystem";
import { collectibles } from "@/components/systems/ObjectiveSystem";
import { getCity, isInWater, px, pz, roadWidthX, roadWidthZ } from "@/components/city/cityData";
import { startGame } from "@/components/Scene";
import { resumeAudio, setMuted, stopRadio } from "@/components/audio/AudioManager";

const MAP_HALF = 360;

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const city = getCity();
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = ref.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const S = cv.width / 2;
      const scale = S / MAP_HALF;
      const p = worldApi.player.pos;
      const s = useGame.getState();

      ctx.clearRect(0, 0, cv.width, cv.height);

      const toX = (x: number) => (x - p.x) * scale + S;
      const toZ = (z: number) => (z - p.z) * scale + S;

      // land / water
      ctx.fillStyle = "#0d2b45";
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#1d2836";
      for (const b of city.blocks) {
        const x0 = toX(b.x0);
        const z0 = toZ(b.z0);
        const w = (b.x1 - b.x0) * scale;
        const h = (b.z1 - b.z0) * scale;
        if (x0 + w < 0 || z0 + h < 0 || x0 > cv.width || z0 > cv.height) continue;
        const water = isInWater(b.x0, b.z0) || isInWater(b.x1, b.z1);
        ctx.fillStyle = water ? "#0d2b45" : "#263140";
        ctx.fillRect(x0, z0, w, h);
      }

      // roads
      ctx.fillStyle = "#3c4a5c";
      for (let i = 0; i <= 8; i++) {
        const w = roadWidthX(i) * scale;
        ctx.fillRect(toX(px(i)) - w / 2, 0, w, cv.height);
        const w2 = roadWidthZ(i) * scale;
        ctx.fillRect(0, toZ(pz(i)) - w2 / 2, cv.width, w2);
      }
      ctx.fillStyle = "#55677d";
      for (let i = -4; i <= 4; i++) {
        ctx.fillRect(toX(px(i)) - 1.5, 0, 3, cv.height);
        ctx.fillRect(0, toZ(pz(i)) - 1.5, cv.width, 3);
      }

      // cops
      ctx.fillStyle = "#3f7bff";
      for (const c of copPositions()) {
        if (!c.active) continue;
        const x = toX(c.x);
        const z = toZ(c.z);
        if (x < -8 || x > cv.width + 8 || z < -8 || z > cv.height + 8) continue;
        ctx.beginPath();
        ctx.arc(x, z, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // collectibles
      ctx.fillStyle = "#ffd25e";
      for (const c of collectibles) {
        if (c.taken) continue;
        const x = toX(c.x);
        const z = toZ(c.z);
        if (x < -6 || x > cv.width + 6 || z < -6 || z > cv.height + 6) continue;
        ctx.beginPath();
        ctx.arc(x, z, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // objective markers
      const o = s.objective;
      if (o) {
        ctx.fillStyle = "#ffc107";
        ctx.beginPath();
        ctx.arc(toX(o.location[0]), toZ(o.location[1]), 4.5, 0, Math.PI * 2);
        ctx.fill();
        if (o.type === "delivery" && (o.progress ?? 0) >= 0.5 && o.target) {
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(toX(o.target[0]), toZ(o.target[1]), 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // vehicles
      ctx.fillStyle = "#9aa7b8";
      for (const v of worldApi.vehicles.values()) {
        if (s.activeVehicleId === v.id) continue;
        const x = toX(v.pos.x);
        const z = toZ(v.pos.z);
        if (x < -4 || x > cv.width + 4 || z < -4 || z > cv.height + 4) continue;
        ctx.fillRect(x - 2, z - 2, 4, 4);
      }

      // player arrow
      ctx.save();
      ctx.translate(S, S);
      ctx.rotate(-worldApi.player.yaw + Math.PI / 2);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, cv.width - 1, cv.height - 1);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="hud-minimap-wrap">
      <canvas ref={ref} width={220} height={220} className="hud-minimap" />
    </div>
  );
}

function WantedStars() {
  const wanted = useGame((s) => s.wanted);
  if (wanted <= 0) return null;
  const stars = Math.min(5, Math.ceil(wanted));
  return (
    <div className="hud-wanted">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < stars ? "star on" : "star"}>★</span>
      ))}
    </div>
  );
}

function Notice() {
  const notice = useGame((s) => s.notice);
  const phase = useGame((s) => s.phase);
  const now = performance.now();
  const show = notice && phase === "playing" && now < notice.until;
  return (
    <div className="hud-notice" data-show={show ? "1" : "0"}>
      {notice?.text ?? ""}
    </div>
  );
}

function ObjectivesPanel() {
  const o = useGame((s) => s.objective);
  const phase = useGame((s) => s.phase);
  if (!o || phase !== "playing") return null;
  const pct = Math.round((o.progress ?? 0) * 100);
  const mins = Math.floor((o.timeLeft ?? 0) / 60);
  const secs = Math.floor((o.timeLeft ?? 0) % 60).toString().padStart(2, "0");
  return (
    <div className="hud-objectives">
      <div className="obj-title">{o.title}</div>
      <div className="obj-desc">{o.desc}</div>
      <div className="obj-progress">
        <div className="obj-bar"><div className="obj-fill" style={{ width: `${pct}%` }} /></div>
        <div className="obj-info">
          <span>{o.progressText ?? ""}</span>
          {o.timeLeft !== undefined && <span className="obj-time">{mins}:{secs}</span>}
        </div>
      </div>
    </div>
  );
}

function Speedometer() {
  const kmh = useGame((s) => s.speedKmh);
  const name = useGame((s) => s.activeVehicleName);
  const mode = useGame((s) => s.cameraMode);
  const control = useGame((s) => s.controlMode);
  const pct = Math.min(100, (kmh / 160) * 100);
  return (
    <div className="hud-speedo">
      <div className="speedo-value">
        <span className="speedo-num">{Math.round(kmh)}</span>
        <span className="speedo-unit">km/h</span>
      </div>
      <div className="speedo-bar"><div className="speedo-fill" style={{ width: `${pct}%` }} /></div>
      <div className="speedo-sub">
        <span>{control === "driving" && name ? name : "On foot"}</span>
        <span className="cam-mode">{mode.replace("-", " ")}</span>
      </div>
    </div>
  );
}

function Crosshair() {
  const control = useGame((s) => s.controlMode);
  if (control === "driving") return null;
  return <div className="hud-crosshair" />;
}

function ResetHint() {
  const show = useGame((s) => s.resetHint);
  if (!show) return null;
  return <div className="hud-resethint">Press <b>R</b> to flip your vehicle back</div>;
}

function ControlsHint() {
  const control = useGame((s) => s.controlMode);
  const phase = useGame((s) => s.phase);
  if (phase !== "playing") return null;
  return (
    <div className="hud-hint">
      {control === "driving"
        ? "W/S drive · A/D steer · SPACE handbrake · E exit · C camera · B horn · J radio · M map"
        : "WASD move · SHIFT run · SPACE jump · E enter car · C camera · M map"}
    </div>
  );
}

function StartMenu() {
  const phase = useGame((s) => s.phase);
  if (phase !== "menu") return null;
  return (
    <div className="hud-menu" onClick={() => startGame()}>
      <div className="menu-card">
        <h1 className="menu-title">MERIDIAN BAY</h1>
        <p className="menu-sub">Open City Chronicles</p>
        <ul className="menu-controls">
          <li><b>WASD</b> move / drive</li>
          <li><b>SHIFT</b> run · <b>SPACE</b> jump / handbrake</li>
          <li><b>E</b> enter / exit vehicle</li>
          <li><b>C</b> camera · <b>H</b> headlights · <b>J</b> radio</li>
          <li><b>P / ESC</b> pause · <b>M</b> minimap</li>
        </ul>
        <div className="menu-start">CLICK TO START</div>
      </div>
    </div>
  );
}

function PauseMenu() {
  const phase = useGame((s) => s.phase);
  const muted = useGame((s) => s.muted);
  const quality = useGame((s) => s.quality);
  if (phase !== "paused") return null;
  const s = useGame.getState();
  return (
    <div className="hud-menu">
      <div className="menu-card">
        <h2 className="menu-title small">PAUSED</h2>
        <div className="menu-btns">
          <button onClick={() => { s.setPhase("playing"); resumeAudio(); }}>Resume</button>
          <button onClick={() => { s.toggleMuted(); setMuted(!muted); }}>
            Sound: {muted ? "Off" : "On"}
          </button>
          <div className="quality-row">
            {(["low", "medium", "high"] as const).map((q) => (
              <button key={q} className={quality === q ? "sel" : ""} onClick={() => s.setQuality(q)}>
                {q}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              stopRadio();
              s.setActiveVehicle(null, null, null);
              s.setControlMode("on-foot");
              s.setObjective(null);
              s.setPhase("menu");
            }}
          >
            Quit to menu
          </button>
        </div>
      </div>
    </div>
  );
}

function MutedBadge() {
  const muted = useGame((s) => s.muted);
  if (!muted) return null;
  return <div className="hud-muted">MUTED</div>;
}

export function HUD() {
  const phase = useGame((s) => s.phase);
  return (
    <>
      <div className="hud-root">
        {phase !== "menu" && (
          <>
            <ObjectivesPanel />
            <div className="hud-top-right">
              <WantedStars />
              <Minimap />
            </div>
            <Notice />
            <Speedometer />
            <Crosshair />
            <ResetHint />
            <ControlsHint />
            <MutedBadge />
          </>
        )}
      </div>
      <StartMenu />
      <PauseMenu />
    </>
  );
}