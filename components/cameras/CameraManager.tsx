"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useGame } from "@/store/gameStore";
import { input } from "@/lib/input/InputManager";
import { worldApi } from "@/lib/worldApi";

const MODE_NAMES: Record<string, string> = {
  chase: "Chase Camera",
  "in-car": "Driver View",
  orbit: "Orbit View",
  cinematic: "Cinematic Chase",
};

export function CameraManager() {
  const { camera } = useThree();
  const orbit = useRef<any>(null);
  const orbitActive = useRef(false);

  const lookYaw = useRef(0);
  const lookPitch = useRef(0.12);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const cineTime = useRef(0);
  const cineActive = useRef(false);

  const pos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      dragging.current = true;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lookYaw.current -= dx * 0.005;
      lookPitch.current = THREE.MathUtils.clamp(lookPitch.current - dy * 0.005, -1.1, 1.2);
    };
    const onUp = () => (dragging.current = false);
    const onWheel = (e: WheelEvent) => {
      const s = useGame.getState();
      if (s.cameraMode === "chase") {
        s.setCameraDistance(THREE.MathUtils.clamp(s.cameraDistance + e.deltaY * 0.01, 3, 16));
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    if (s.phase === "menu") return;

    const v = s.activeVehicleId ? worldApi.vehicles.get(s.activeVehicleId) : undefined;
    const vehicle = s.controlMode === "driving" ? v : undefined;

    let cx: number;
    let cy: number;
    let cz: number;
    let yaw: number;

    if (vehicle) {
      cx = vehicle.pos.x;
      cy = vehicle.pos.y;
      cz = vehicle.pos.z;
      yaw = vehicle.yaw;
    } else {
      cx = worldApi.player.pos.x;
      cy = worldApi.player.pos.y;
      cz = worldApi.player.pos.z;
      yaw = worldApi.player.yaw;
    }

    // camera mode cycling
    if (input.justPressed("camera")) {
      const order = ["chase", "in-car", "orbit", "cinematic"];
      const next = order[(order.indexOf(s.cameraMode) + 1) % order.length];
      s.setCameraMode(next as any);
      s.notify(MODE_NAMES[next]);
      orbitActive.current = next === "orbit";
    }
    if (input.justPressed("headlights")) {
      // no-op; headlights handled by vehicle controller
    }

    // cinematic auto-trigger during high-wanted chases
    if (s.cameraMode !== "orbit" && s.wanted >= 3 && vehicle && vehicle.speed > 12) {
      cineTime.current += dt;
      if (cineTime.current > 5 && !cineActive.current) {
        cineActive.current = true;
        s.setCameraMode("cinematic");
        s.notify("Cinematic Chase");
      }
    } else {
      cineTime.current = 0;
    }
    if (s.cameraMode === "cinematic" && cineActive.current) {
      const back = vehicle && vehicle.speed < 6;
      if (back || s.wanted < 3) {
        s.setCameraMode("chase");
        s.notify(MODE_NAMES.chase);
        cineActive.current = false;
      }
    }

    // orbit mode
    const dir = new THREE.Vector3(Math.sin(yaw + Math.PI), 0, Math.cos(yaw + Math.PI));
    if (s.cameraMode === "orbit") {
      if (orbit.current) {
        if (!orbitActive.current) {
          const dist = 8;
          camera.position.set(cx - dir.x * dist, cy + 3, cz - dir.z * dist);
          orbitActive.current = true;
        }
        orbit.current.target.set(cx, cy + 1, cz);
        orbit.current.update();
      }
      return;
    }
    orbitActive.current = false;

    if (s.cameraMode === "chase") {
      const dist = s.cameraDistance;
      const height = vehicle ? 2.6 : 2.0;
      pos.set(cx - dir.x * dist, cy + height, cz - dir.z * dist);
      target.set(cx + dir.x * 4, cy + (vehicle ? 0.6 : 0.4), cz + dir.z * 4);
    } else if (s.cameraMode === "in-car") {
      pos.set(cx + dir.x * 1.6, cy + (vehicle ? 0.55 : 0.4), cz + dir.z * 1.6);
      target.set(cx + dir.x * 14, cy + 0.4, cz + dir.z * 14);
    } else if (s.cameraMode === "cinematic") {
      const low = 1.1;
      pos.set(cx - dir.x * 5.6, cy + low, cz - dir.z * 5.6);
      target.set(cx + dir.x * 8, cy + 0.5, cz + dir.z * 8);
    }

    // on-foot: free mouse look rotation
    if (!vehicle && s.cameraMode === "chase") {
      const lx = Math.sin(lookYaw.current) * Math.cos(lookPitch.current);
      const ly = Math.sin(lookPitch.current);
      const lz = Math.cos(lookYaw.current) * Math.cos(lookPitch.current);
      target.set(cx + lx * 8, cy + ly * 8, cz + lz * 8);
      pos.set(cx - lx * 3, cy + ly * 1.6, cz - lz * 3);
    } else if (vehicle && s.cameraMode === "chase") {
      // smooth follow with slight lookahead
    }

    // damping
    camera.position.x += (pos.x - camera.position.x) * (1 - Math.exp(-4.2 * dt));
    camera.position.y += (pos.y - camera.position.y) * (1 - Math.exp(-4.2 * dt));
    camera.position.z += (pos.z - camera.position.z) * (1 - Math.exp(-4.2 * dt));
    camera.lookAt(target);

    worldApi.camera.mode = s.cameraMode;
  });

  const orbitEnabled = useGame((s) => s.cameraMode === "orbit");

  return (
    <group>
      <OrbitControls
        ref={orbit}
        enabled={orbitEnabled}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
      />
    </group>
  );
}