"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SEA_LINE, WATER_Y, overpassElevation } from "./cityData";
import { waterTexture } from "@/lib/procgen/textures";
import { useGame } from "@/store/gameStore";

export function Water() {
  const tex = useMemo(() => waterTexture(), []);
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        color: "#2c6d8a",
        transparent: true,
        opacity: 0.92,
        roughness: 0.25,
        metalness: 0.35,
      }),
    [tex]
  );

  useFrame((st) => {
    const s = useGame.getState();
    if (ref.current) {
      tex.offset.x = st.clock.elapsedTime * 0.006;
      tex.offset.y = st.clock.elapsedTime * 0.003;
    }
    // night tinting via dayTime in cover colors
    const day = smoothDay(s.dayTime);
    mat.color.setHSL(0.54, 0.5, 0.35 + day * 0.18);
  });

  const W = 1600;
  return (
    <group name="water">
      <mesh ref={ref} material={mat} position={[0, WATER_Y, -200]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 0.2, W * 0.2]} />
      </mesh>
      {/* ocean beyond the east shore */}
      <mesh position={[SEA_LINE + 220, WATER_Y - 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1100, 2400]} />
        <meshBasicMaterial color="#1d4b66" />
      </mesh>
      {/* river */}
      <RiverBand />
      <Pier />
      <Boardwalk />
    </group>
  );
}

function smoothDay(t: number): number {
  const day = t > 0 && t < 0.5 ? 1 : 0;
  return day;
}

function RiverBand() {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a86a8",
        transparent: true,
        opacity: 0.85,
        roughness: 0.3,
      }),
    []
  );
  return (
    <mesh position={[118, WATER_Y, -110]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[60, 180]} />
    </mesh>
  );
}

function Pier() {
  return (
    <group name="pier" position={[SEA_LINE - 26, 0, 0]}>
      <mesh position={[10, 0.4, 0]} castShadow>
        <boxGeometry args={[40, 0.8, 10]} />
        <meshStandardMaterial color="#8a6a4b" roughness={0.9} />
      </mesh>
      <mesh position={[14, 1.4, -2]} castShadow>
        <boxGeometry args={[0.5, 2, 0.5]} />
        <meshStandardMaterial color="#6a5236" roughness={0.9} />
      </mesh>
      <mesh position={[14, 1.4, 2]} castShadow>
        <boxGeometry args={[0.5, 2, 0.5]} />
        <meshStandardMaterial color="#6a5236" roughness={0.9} />
      </mesh>
      <mesh position={[10, 1.6, 0]}>
        <boxGeometry args={[30, 0.3, 1.2]} />
        <meshStandardMaterial color="#7a5c3c" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Boardwalk() {
  return (
    <mesh position={[SEA_LINE - 44, 0.35, 0]} rotation={[0, 0, 0]}>
      <boxGeometry args={[4, 0.7, 1200]} />
      <meshStandardMaterial color="#a5875f" roughness={0.85} />
    </mesh>
  );
}