"use client";

import { Roads } from "./Roads";
import { Buildings } from "./Buildings";
import { Props } from "./Props";
import { Water } from "./Water";
import { Landmarks } from "./Landmarks";

export function CityLayout() {
  return (
    <group name="city">
      <Roads />
      <Buildings />
      <Props />
      <Landmarks />
      <Water />
    </group>
  );
}