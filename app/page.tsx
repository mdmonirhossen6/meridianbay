"use client";

import dynamic from "next/dynamic";
import { HUD } from "@/components/ui/HUD";

const Scene = dynamic(() => import("@/components/Scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => <div className="boot-screen">LOADING MERIDIAN BAY…</div>,
});

export default function Home() {
  return (
    <main style={{ position: "fixed", inset: 0 }}>
      <Scene />
      <HUD />
    </main>
  );
}