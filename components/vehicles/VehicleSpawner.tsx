"use client";

import { useMemo } from "react";
import { getCity, groundHeightAt } from "@/components/city/cityData";
import { mulberry32 } from "@/lib/procgen/noise";
import { PAINT_PALETTE, VEHICLE_CONFIGS } from "./vehicleConfigs";
import { Sedan } from "./Sedan";
import { SportsCoupe } from "./SportsCoupe";
import { TruckSUV } from "./TruckSUV";
import { Motorcycle } from "./Motorcycle";

export function VehicleSpawner() {
  const city = getCity();
  const vehicles = useMemo(() => {
    const rng = mulberry32(888);
    return city.spawns.map((s, i) => {
      const cfg = VEHICLE_CONFIGS[s.type] ?? VEHICLE_CONFIGS.sedan;
      return {
        type: s.type,
        id: `parked-${i}`,
        pos: [s.x, groundHeightAt(s.x, s.z) + cfg.clearance, s.z] as [number, number, number],
        yaw: s.yaw,
        color: PAINT_PALETTE[Math.floor(rng() * PAINT_PALETTE.length)],
      };
    });
  }, [city]);

  return (
    <group name="parked-vehicles">
      {vehicles.map((v) => {
        if (v.type === "sedan")
          return <Sedan key={v.id} id={v.id} color={v.color} position={v.pos} yaw={v.yaw} />;
        if (v.type === "sports")
          return <SportsCoupe key={v.id} id={v.id} color={v.color} position={v.pos} yaw={v.yaw} />;
        if (v.type === "suv")
          return <TruckSUV key={v.id} id={v.id} color={v.color} position={v.pos} yaw={v.yaw} />;
        return <Motorcycle key={v.id} id={v.id} color={v.color} position={v.pos} yaw={v.yaw} />;
      })}
    </group>
  );
}