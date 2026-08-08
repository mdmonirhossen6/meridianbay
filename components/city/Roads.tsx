"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { GRID, px, pz, roadWidthX, roadWidthZ, CELL } from "./cityData";
import { asphaltTexture, sidewalkTexture, laneDashTexture, crosswalkTexture, curbTexture, grassTexture } from "@/lib/procgen/textures";

export function Roads() {
  const tex = useMemo(
    () => ({
      asphalt: asphaltTexture(7),
      lane: laneDashTexture(),
      cross: crosswalkTexture(),
      sidewalk: sidewalkTexture(),
      curb: curbTexture(),
      grass: grassTexture(3),
    }),
    []
  );

  const ext = (GRID - 1) * CELL;

  return (
    <group name="roads">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[ext + 400, ext + 400]} />
        <meshStandardMaterial map={tex.grass} color="#5d7f43" roughness={1} />
      </mesh>

      {/* vertical roads */}
      {Array.from({ length: GRID }, (_, i) => {
        const x = px(i);
        const w = roadWidthX(i);
        return (
          <group key={`v${i}`}>
            <mesh position={[x, 0.02, 0]} receiveShadow>
              <boxGeometry args={[w, 0.14, ext]} />
              <meshStandardMaterial map={tex.asphalt} roughness={0.92} />
            </mesh>
            <mesh position={[x, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.16, ext]} />
              <meshBasicMaterial map={tex.lane} transparent opacity={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* horizontal roads */}
      {Array.from({ length: GRID }, (_, j) => {
        const z = pz(j);
        const w = roadWidthZ(j);
        return (
          <group key={`h${j}`}>
            <mesh position={[0, 0.02, z]} receiveShadow>
              <boxGeometry args={[ext, 0.14, w]} />
              <meshStandardMaterial map={tex.asphalt} roughness={0.92} />
            </mesh>
            <mesh position={[0, 0.085, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[ext, 0.16]} />
              <meshBasicMaterial map={tex.lane} transparent opacity={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* crosswalks */}
      {Array.from({ length: GRID }, (_, i) =>
        Array.from({ length: GRID }, (_, j) => (
          <group key={`xw${i}-${j}`}>
            <mesh position={[px(i), 0.085, pz(j) - 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[roadWidthX(i) * 0.72, 3.4]} />
              <meshBasicMaterial map={tex.cross} transparent opacity={0.85} />
            </mesh>
            <mesh position={[px(i), 0.085, pz(j) + 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[roadWidthX(i) * 0.72, 3.4]} />
              <meshBasicMaterial map={tex.cross} transparent opacity={0.85} />
            </mesh>
            <mesh position={[px(i) - 3.2, 0.085, pz(j)]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[roadWidthZ(j) * 0.72, 3.4]} />
              <meshBasicMaterial map={tex.cross} transparent opacity={0.85} />
            </mesh>
            <mesh position={[px(i) + 3.2, 0.085, pz(j)]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[roadWidthZ(j) * 0.72, 3.4]} />
              <meshBasicMaterial map={tex.cross} transparent opacity={0.85} />
            </mesh>
          </group>
        ))
      )}

      {/* sidewalks along vertical roads */}
      {Array.from({ length: GRID }, (_, i) => {
        const x = px(i);
        const half = roadWidthX(i) / 2;
        return (
          <group key={`sw${i}`}>
            <mesh position={[x + half + 1.6, 0.18, 0]} receiveShadow>
              <boxGeometry args={[3, 0.36, ext]} />
              <meshStandardMaterial map={tex.sidewalk} roughness={0.95} />
            </mesh>
            <mesh position={[x - half - 1.6, 0.18, 0]} receiveShadow>
              <boxGeometry args={[3, 0.36, ext]} />
              <meshStandardMaterial map={tex.sidewalk} roughness={0.95} />
            </mesh>
            <mesh position={[x - half - 0.25, 0.05, 0]}>
              <boxGeometry args={[0.5, 0.1, ext]} />
              <meshStandardMaterial map={tex.curb} />
            </mesh>
            <mesh position={[x + half + 0.25, 0.05, 0]}>
              <boxGeometry args={[0.5, 0.1, ext]} />
              <meshStandardMaterial map={tex.curb} />
            </mesh>
          </group>
        );
      })}

      {/* sidewalks along horizontal roads */}
      {Array.from({ length: GRID }, (_, j) => {
        const z = pz(j);
        const half = roadWidthZ(j) / 2;
        return (
          <group key={`sh${j}`}>
            <mesh position={[0, 0.18, z + half + 1.6]} receiveShadow>
              <boxGeometry args={[ext, 0.36, 3]} />
              <meshStandardMaterial map={tex.sidewalk} roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.18, z - half - 1.6]} receiveShadow>
              <boxGeometry args={[ext, 0.36, 3]} />
              <meshStandardMaterial map={tex.sidewalk} roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.05, z - half - 0.25]}>
              <boxGeometry args={[ext, 0.1, 0.5]} />
              <meshStandardMaterial map={tex.curb} />
            </mesh>
            <mesh position={[0, 0.05, z + half + 0.25]}>
              <boxGeometry args={[ext, 0.1, 0.5]} />
              <meshStandardMaterial map={tex.curb} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}