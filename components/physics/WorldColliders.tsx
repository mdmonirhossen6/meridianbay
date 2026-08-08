"use client";

import { useMemo } from "react";
import { CuboidCollider, RigidBody, TrimeshCollider } from "@react-three/rapier";
import { SEA_LINE, getCity, terrainHeight } from "@/components/city/cityData";

const GRID_X0 = -400;
const GRID_X1 = 380;
const GRID_Z0 = -400;
const GRID_Z1 = 400;
const STEP = 12.5;

function buildGround() {
  const positions: number[] = [];
  const indices: number[] = [];
  let cols = 0;
  let rows = 0;
  for (let x = GRID_X0; x <= GRID_X1 + 0.01; x += STEP) {
    let row = 0;
    for (let z = GRID_Z0; z <= GRID_Z1 + 0.01; z += STEP) {
      let y = terrainHeight(x, z);
      if (x > SEA_LINE + 260) y = Math.min(y, -30);
      positions.push(x, y, z);
      row++;
    }
    rows = row;
    cols++;
  }
  for (let i = 0; i < cols - 1; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = a + 1;
      const c = a + rows;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}

const SEA_X = SEA_LINE + 3;

export function WorldColliders() {
  const ground = useMemo(() => buildGround(), []);
  const buildings = useMemo(() => getCity().buildings, []);

  const walls: { p: [number, number, number]; h: [number, number, number] }[] = useMemo(
    () => [
      { p: [SEA_X, 4, 0], h: [2, 9, 500] },
      { p: [-402, 4, 0], h: [2, 9, 402] },
      { p: [380, 4, 0], h: [2, 9, 402] },
      { p: [0, 4, -402], h: [402, 9, 2] },
      { p: [0, 4, 402], h: [402, 9, 2] },
      { p: [0, -40, 0], h: [440, 4, 440] },
    ],
    []
  );

  return (
    <RigidBody type="fixed" colliders={false} userData={{ worldCollider: true }}>
      <TrimeshCollider args={[ground.positions, ground.indices]} friction={0.4} restitution={0} />
      {buildings.map((b, i) => (
        <CuboidCollider key={i} args={[b.w / 2, b.h / 2, b.d / 2]} position={[b.x, b.h / 2, b.z]} />
      ))}
      {walls.map((w) => (
        <CuboidCollider key={`${w.p[0]}-${w.p[2]}`} args={w.h} position={w.p} />
      ))}
    </RigidBody>
  );
}