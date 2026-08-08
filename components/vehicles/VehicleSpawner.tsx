"use client";

import { useMemo } from "react";
import { getCity } from "@/components/city/cityData";
import { mulberry32 } from "@/lib/procgen/noise";
import { PAINT_PALETTE } from "./vehicleConfigs";
import { Sedan } from "./Sedan";
import { SportsCoupe } from "./SportsCoupe";
import { TruckSUV } from "./TruckSUV";
import { Motorcycle } from "./Motorcycle";

export function VehicleSpawner() {
  const city = getCity();
  const vehicles = useMemo(() => {
    const rng = mulberry32(888);
    return city.spawns.map((s, i) => ({
      type: s.type,
      id: `parked-${i}`,
      pos: [s.x, 0.5, s.z] as [number, number, number],
      yaw: s.yaw,
      color: PAINT_PALETTE[Math.floor(rng() * PAINT_PALETTE.length)],
    }));
  }, [city]);

  return (
    <group name="parked-vehicles">
      {vehicles.map((v) => {
        const key = `parked-${v.id}`;
        if (v.type === "sedan")
          return <Sedan key={key} id={key} color={v.color} position={v.pos} yaw={v.yaw} />;
        if (v.type === "sports")
          return <SportsCoupe key={key} id={key} color={v.color} position={v.pos} yaw={v.yaw} />;
        if (v.type === "suv")
          return <TruckSUV key={key} id={key} color={v.color} position={v.pos} yaw={v.yaw} />;
        return <Motorcycle key={key} id={key} color={v.color} position={v.pos} yaw={v.yaw} />;
      })}
    </group>
  );
}