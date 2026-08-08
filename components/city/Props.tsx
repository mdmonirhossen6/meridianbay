"use client";

import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";
import { Instances, Instance } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { GRID, px, pz, CELL, SEA_LINE, getCity } from "./cityData";
import { mulberry32 } from "@/lib/procgen/noise";
import { billboardTexture } from "@/lib/procgen/textures";
import { worldApi } from "@/lib/worldApi";

const EXT = (GRID - 1) * CELL;

const poleMat = new THREE.MeshStandardMaterial({ color: "#3a3d45", metalness: 0.5, roughness: 0.6 });
const trunkMat = new THREE.MeshStandardMaterial({ color: "#5a4632", roughness: 0.95 });
const palmTrunkMat = new THREE.MeshStandardMaterial({ color: "#6f5d45", roughness: 0.95 });
const leafMat = new THREE.MeshStandardMaterial({ color: "#3f7a3c", roughness: 0.9 });
const palmLeafMat = new THREE.MeshStandardMaterial({ color: "#2f7a45", roughness: 0.85 });
const craneMat = new THREE.MeshStandardMaterial({ color: "#c96f2f", metalness: 0.2, roughness: 0.7 });
const fountainMat = new THREE.MeshStandardMaterial({ color: "#cbc6bd", roughness: 0.7 });
const containerMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });

export function Props() {
  const city = getCity();

  const streetlights = useMemo(() => {
    const list: { x: number; z: number }[] = [];
    const half = EXT / 2;
    for (let i = 0; i < GRID; i++) {
      for (let z = -half + CELL * 0.5; z <= half - CELL * 0.5; z += CELL) {
        list.push({ x: px(i) - 10, z });
        list.push({ x: px(i) + 10, z });
      }
    }
    for (let j = 0; j < GRID; j++) {
      for (let x = -half + CELL * 0.5; x <= half - CELL * 0.5; x += CELL) {
        list.push({ x, z: pz(j) - 10 });
        list.push({ x, z: pz(j) + 10 });
      }
    }
    return list;
  }, []);

  const trees = useMemo(() => {
    const list: { x: number; z: number; s: number }[] = [];
    const rng = mulberry32(777);
    for (const b of city.blocks) {
      if (b.district !== "residential" && b.district !== "park") continue;
      const count = b.district === "park" ? 6 : 3;
      for (let k = 0; k < count; k++) {
        list.push({
          x: b.x0 + 5 + rng() * (b.x1 - b.x0 - 10),
          z: b.z0 + 5 + rng() * (b.z1 - b.z0 - 10),
          s: 0.8 + rng() * 0.7,
        });
      }
    }
    return list;
  }, [city]);

  const palms = useMemo(() => {
    const list: { x: number; z: number; s: number }[] = [];
    const rng = mulberry32(999);
    for (let x = SEA_LINE - 32; x < SEA_LINE - 2; x += 3.5) {
      for (let z = -EXT; z <= EXT; z += 6) {
        if (rng() > 0.62) continue;
        list.push({ x: x + (rng() - 0.5) * 1.8, z: z + (rng() - 0.5) * 4, s: 0.85 + rng() * 0.55 });
      }
    }
    return list;
  }, []);

  const containers = useMemo(() => {
    const list: { x: number; z: number; y: number; rot: number; c: string }[] = [];
    const rng = mulberry32(1234);
    const cols = ["#b3402f", "#2f6fb3", "#3f8e4f", "#b3a62f", "#8a62a8"];
    for (const b of city.blocks) {
      if (b.district !== "industrial") continue;
      const n = 8 + Math.floor(rng() * 8);
      for (let k = 0; k < n; k++) {
        const rot = rng() > 0.5 ? 0 : Math.PI / 2;
        list.push({
          x: b.x0 + 3 + rng() * (b.x1 - b.x0 - 6),
          z: b.z0 + 3 + rng() * (b.z1 - b.z0 - 6),
          y: 1.2,
          rot,
          c: cols[Math.floor(rng() * cols.length)],
        });
      }
      for (let k = 0; k < 2; k++) {
        list.push({
          x: b.x0 + 18 + rng() * 20,
          z: b.z0 + 8 + rng() * 14,
          y: 3.6,
          rot: rng() > 0.5 ? 0 : Math.PI / 2,
          c: cols[Math.floor(rng() * cols.length)],
        });
      }
    }
    return list;
  }, [city]);

  const plaza = useMemo(() => {
    const b = city.blocks.find((bb) => bb.district === "park");
    return b ? { cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2 } : { cx: 0, cz: 0 };
  }, [city]);

  const cranePos = useMemo(() => {
    const lm = city.landmarks[1];
    return { x: lm.x + 54, z: lm.z };
  }, [city]);

  return (
    <group name="props">
      <Instances count={streetlights.length} geometry={new THREE.CylinderGeometry(0.06, 0.09, 6.2, 6)} material={poleMat} castShadow>
        {streetlights.map((s, i) => (
          <Instance key={i} position={[s.x, 3.1, s.z]} />
        ))}
      </Instances>
      <LampGlow list={streetlights} />

      <Instances count={trees.length} geometry={new THREE.CylinderGeometry(0.1, 0.16, 1.8, 6)} material={trunkMat} castShadow>
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 0.9 * t.s, t.z]} scale={[t.s, t.s * 0.5, t.s]} />
        ))}
      </Instances>
      <Instances count={trees.length} geometry={new THREE.IcosahedronGeometry(0.95, 1)} material={leafMat} castShadow>
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 2.3 * t.s, t.z]} scale={[t.s, t.s, t.s]} />
        ))}
      </Instances>

      <Instances count={palms.length} geometry={new THREE.CylinderGeometry(0.07, 0.13, 3.6, 6)} material={palmTrunkMat} castShadow>
        {palms.map((p, i) => (
          <Instance key={i} position={[p.x, 1.8 * p.s, p.z]} scale={[1, p.s, 1]} />
        ))}
      </Instances>
      <Instances count={palms.length} geometry={new THREE.ConeGeometry(1.8, 0.6, 6)} material={palmLeafMat} castShadow>
        {palms.map((p, i) => (
          <Instance key={i} position={[p.x, 3.7 * p.s, p.z]} scale={p.s} />
        ))}
      </Instances>

      <Instances count={containers.length} geometry={new THREE.BoxGeometry(5.6, 2.4, 2.2)} material={containerMat} castShadow>
        {containers.map((c, i) => (
          <Instance key={i} position={[c.x, c.y, c.z]} rotation={[0, c.rot, 0]} color={c.c} />
        ))}
      </Instances>

      <Crane position={[cranePos.x, 0, cranePos.z]} />
      <Fountain position={[plaza.cx, plaza.cz]} />

      <Billboard sign="SUNSET TOURS" accent="#ffd166" bg="#17344f" position={[-EXT / 2 - 14, 0, -30]} rotY={Math.PI / 2} />
      <Billboard sign="AURORA FM" accent="#5ee8ff" bg="#2c1f4f" position={[EXT / 2 + 14, 0, 30]} rotY={-Math.PI / 2} />
    </group>
  );
}

function LampGlow({ list }: { list: { x: number; z: number }[] }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fff3d0",
        emissive: new THREE.Color("#ffd98a"),
        emissiveIntensity: 0,
        roughness: 0.3,
      }),
    []
  );
  useEffect(() => {
    worldApi.cityGlow.push({ mat, base: 1.1 });
    return () => {
      const idx = worldApi.cityGlow.findIndex((g) => g.mat === mat);
      if (idx >= 0) worldApi.cityGlow.splice(idx, 1);
    };
  }, [mat]);
  return (
    <Instances count={list.length} geometry={new THREE.SphereGeometry(0.26, 8, 8)} material={mat}>
      {list.map((s, i) => (
        <Instance key={i} position={[s.x, 6.0, s.z]} />
      ))}
    </Instances>
  );
}

function Crane({ position }: { position: [number, number, number] }) {
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh position={[0, 4, 0]} material={craneMat} castShadow>
        <boxGeometry args={[0.8, 8, 0.8]} />
      </mesh>
      <mesh position={[0, 8, -3]} material={craneMat} castShadow>
        <boxGeometry args={[0.6, 0.6, 6]} />
      </mesh>
      <mesh position={[0, 8, -6]} material={craneMat}>
        <boxGeometry args={[0.06, 3, 0.06]} />
      </mesh>
      <mesh position={[0, 6.4, -5.5]} material={craneMat}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
      </mesh>
    </group>
  );
}

function Fountain({ position }: { position: [number, number] }) {
  const water = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    if (water.current) {
      water.current.position.y = position[1] + 0.78 + Math.sin(st.clock.elapsedTime * 1.1) * 0.05;
    }
  });
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0, 0]} material={fountainMat} receiveShadow>
        <cylinderGeometry args={[5.5, 6, 1.2, 16]} />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={fountainMat}>
        <cylinderGeometry args={[0.35, 0.5, 2, 10]} />
      </mesh>
      <mesh ref={water} position={[0, 0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.4, 24]} />
        <meshStandardMaterial color="#5fbfe6" transparent opacity={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Billboard({ sign, accent, bg, position, rotY }: { sign: string; accent: string; bg: string; position: [number, number, number]; rotY: number }) {
  const tex = useMemo(() => billboardTexture(sign, accent, bg), [sign, accent, bg]);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 3.4, 0]} material={poleMat} castShadow>
        <boxGeometry args={[8, 5, 0.3]} />
      </mesh>
      <mesh position={[0, 1.7, -0.75]} material={craneMat} castShadow>
        <boxGeometry args={[0.35, 4.4, 0.35]} />
      </mesh>
      <mesh position={[0, 3.4, 0.16]}>
        <planeGeometry args={[7.6, 4.6]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  );
}