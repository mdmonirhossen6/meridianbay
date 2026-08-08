"use client";

import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { getCity } from "./cityData";
import { facadeTexture } from "@/lib/procgen/textures";
import { worldApi } from "@/lib/worldApi";

export function Buildings() {
  const city = getCity();

  const data = useMemo(() => {
    const towers: { pos: THREE.Vector3; scale: THREE.Vector3; seed: number }[] = [];
    const apts: typeof towers = [];
    const houses: typeof towers = [];
    const warehouses: typeof towers = [];

    for (const b of city.buildings) {
      const pos = new THREE.Vector3(b.x, b.h / 2, b.z);
      const scale = new THREE.Vector3(b.w, b.h, b.d);
      const base = { pos, scale, seed: b.seed };
      if (b.type === "tower") towers.push(base);
      else if (b.type === "apt") apts.push(base);
      else if (b.type === "house") houses.push(base);
      else if (b.type === "warehouse") warehouses.push(base);
    }
    return { towers, apts, houses, warehouses };
  }, [city]);

  const towerMats = useMemo(
    () => Array.from({ length: 4 }, (_, k) => new THREE.MeshStandardMaterial({ map: facadeTexture(300 + k, 22, k), roughness: 0.85 })),
    []
  );
  const aptMat = useMemo(() => new THREE.MeshStandardMaterial({ map: facadeTexture(600, 9, 1), roughness: 0.9 }), []);
  const houseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9b18c", roughness: 0.9 }), []);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#51708f", roughness: 0.7, side: THREE.DoubleSide }), []);
  const warehouseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8f7d63", roughness: 0.95 }), []);

  useEffect(() => {
    const glows: { mat: THREE.MeshStandardMaterial; base: number }[] = [];
    for (const m of towerMats) glows.push({ mat: m, base: 0.75 });
    glows.push({ mat: aptMat, base: 0.65 });
    glows.push({ mat: warehouseMat, base: 0.4 });
    for (const g of glows) worldApi.cityGlow.push(g);
    return () => {
      for (const g of glows) {
        const idx = worldApi.cityGlow.indexOf(g);
        if (idx >= 0) worldApi.cityGlow.splice(idx, 1);
      }
    };
  }, [towerMats, aptMat, warehouseMat]);

  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  return (
    <group name="buildings">
      {data.towers.length > 0 && (
        <group>
          <Instances count={data.towers.length} geometry={box} material={towerMats[0]} castShadow receiveShadow>
            {data.towers.map((t, i) => (
              <Instance key={i} position={t.pos.toArray()} scale={t.scale.toArray()} />
            ))}
          </Instances>
          <Instances count={data.towers.length} geometry={box} material={towerMats[1]}> 
            {data.towers.slice(0, Math.floor(data.towers.length * 0.33)).map((t, i) => (
              <Instance key={i} position={t.pos.toArray()} scale={t.scale.toArray()} />
            ))}
          </Instances>
        </group>
      )}
      {data.apts.length > 0 && (
        <Instances count={data.apts.length} geometry={box} material={aptMat} receiveShadow>
          {data.apts.map((a, i) => (
            <Instance key={i} position={a.pos.toArray()} scale={a.scale.toArray()} />
          ))}
        </Instances>
      )}
      {data.houses.length > 0 && (
        <group>
          <Instances count={data.houses.length} geometry={box} material={houseMat} castShadow receiveShadow>
            {data.houses.map((h, i) => (
              <Instance key={i} position={h.pos.toArray()} scale={h.scale.toArray()} />
            ))}
          </Instances>
          {/* gable roofs */}
          <Instances count={data.houses.length} geometry={new THREE.ConeGeometry(1, 1.2, 4, 1)} material={roofMat}>
            {data.houses.map((h, i) => (
              <Instance
                key={i}
                position={[h.pos.x, h.scale.y + 0.6, h.pos.z]}
                scale={[h.scale.x * 0.8, 1, h.scale.z * 0.8]}
                rotation={[0, 0, 0]}
              />
            ))}
          </Instances>
        </group>
      )}
      {data.warehouses.length > 0 && (
        <group>
          <Instances count={data.warehouses.length} geometry={box} material={warehouseMat} castShadow receiveShadow>
            {data.warehouses.map((w, i) => (
              <Instance key={i} position={w.pos.toArray()} scale={w.scale.toArray()} />
            ))}
          </Instances>
          <Instances count={data.warehouses.length} geometry={new THREE.CylinderGeometry(0.02, 0.02, 1, 6)} material={warehouseMat}>
            {data.warehouses.map((w, i) => (
              <Instance key={i} position={w.pos} scale={1} />
            ))}
          </Instances>
        </group>
      )}
    </group>
  );
}