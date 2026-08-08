"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { buildTrafficGraph, edgePosition, groundHeightAt, type TrafficEdge } from "../city/cityData";
import { useGame } from "@/store/gameStore";
import { mulberry32, clamp } from "@/lib/procgen/noise";

interface Agent {
  edge: number;
  t: number;
  speed: number;
  desired: number;
  color: number;
}

const PALETTE = ["#c0392b", "#2e86c1", "#7f8c8d", "#f39c12", "#8e44ad", "#16a085", "#d35400", "#1a5276", "#b03a2c", "#5d6d7e"];

export function TrafficAI({ count = 26 }: { count?: number }) {
  const graph = useMemo(() => buildTrafficGraph(), []);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const cabRef = useRef<THREE.InstancedMesh>(null);

  const agents = useMemo<Agent[]>(() => {
    const rng = mulberry32(31337);
    const list: Agent[] = [];
    for (let i = 0; i < count; i++) {
      const edge = Math.floor(rng() * graph.edges.length);
      list.push({
        edge,
        t: rng(),
        speed: 4 + rng() * 5,
        desired: 7 + rng() * 7,
        color: Math.floor(rng() * PALETTE.length),
      });
    }
    return list;
  }, [graph, count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7 }), []);
  const cab = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3b4b57", metalness: 0.3, roughness: 0.4 }), []);

  useEffect(() => {
    if (bodyRef.current) {
      for (let i = 0; i < agents.length; i++) {
        bodyRef.current.setColorAt(i, new THREE.Color(PALETTE[agents[i].color]));
      }
      if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    }
  }, [agents]);

  useFrame((_, rawDt) => {
    const dt = clamp(rawDt, 0, 0.05);
    const s = useGame.getState();
    if (s.phase !== "playing") return;

    const phase = Math.floor(performance.now() / 1300) % 3;

    for (let i = 0; i < agents.length; i++) {
      const c = agents[i];
      const e = graph.edges[c.edge];

      let target = c.desired;
      const nearEnd = e.dir > 0 ? c.t > 0.93 : c.t < 0.07;
      if (nearEnd && e.dir > 0 && phase === 2) target = 0;

      for (let k = 0; k < agents.length; k++) {
        if (k === i) continue;
        const o = agents[k];
        if (o.edge === c.edge && o.t > c.t && o.t - c.t < 0.13 && o.speed < c.speed) {
          target = Math.min(target, o.speed);
        }
      }

      c.speed += clamp(target - c.speed, -1.4 * dt, 1.4 * dt);
      c.t += (c.speed * dt) / e.len;

      if (c.t >= 1 && e.dir > 0) {
        c.edge = chooseNext(graph.edges, e.b, e.a);
        c.t = 0.02 + Math.random() * 0.05;
      } else if (c.t <= 0 && e.dir < 0) {
        c.edge = chooseNext(graph.edges, e.a, e.b);
        c.t = 0.95;
      } else {
        c.t = clamp(c.t, 0.001, 0.999);
      }

      const e2 = graph.edges[c.edge];
      const p = edgePosition(e2, graph.nodes, c.t);
      const y = groundHeightAt(p.x, p.z);
      const yaw = e2.axis === "x" ? (e2.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : e2.dir > 0 ? 0 : Math.PI;

      dummy.position.set(p.x, y + 0.06, p.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bodyRef.current?.setMatrixAt(i, dummy.matrix);
      cabRef.current?.setMatrixAt(i, dummy.matrix);
    }
    if (bodyRef.current) {
      bodyRef.current.instanceMatrix.needsUpdate = true;
    }
    if (cabRef.current) {
      cabRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group name="traffic">
      <instancedMesh ref={bodyRef} args={[undefined, undefined, count]} material={body} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.05, 4.2]} />
      </instancedMesh>
      <instancedMesh ref={cabRef} args={[undefined, undefined, count]} material={cab}>
        <boxGeometry args={[1.62, 0.62, 2.0]} />
      </instancedMesh>
    </group>
  );
}

function chooseNext(edges: TrafficEdge[], from: number, avoid: number): number {
  const cand: number[] = [];
  for (let i = 0; i < edges.length; i++) {
    if (edges[i].a === from && edges[i].b !== avoid) cand.push(i);
  }
  if (cand.length === 0) return 0;
  return cand[Math.floor(Math.random() * cand.length)];
}