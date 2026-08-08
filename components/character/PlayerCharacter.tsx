"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useGame } from "@/store/gameStore";
import { input } from "@/lib/input/InputManager";
import { worldApi, findNearestVehicle } from "@/lib/worldApi";
import { getCity, groundHeightAt } from "@/components/city/cityData";
import { clamp } from "@/lib/procgen/noise";
import {
  ACCEL_RUN,
  ACCEL_WALK,
  AIR_ACCEL_SCALE,
  BODY_OFFSET,
  BRAKE,
  CAPSULE_HALF,
  CAPSULE_RADIUS,
  JUMP_VELOCITY,
  RUN_SPEED,
  WALK_SPEED,
  exitVehiclePosition,
  smoothYaw,
} from "./CharacterController";

export function PlayerCharacter({ start }: { start?: [number, number, number] }) {
  const headRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<any>(null);

  const spawn = useMemo(() => {
    const city = getCity();
    const sp = city.spawns[0];
    return {
      x: start ? start[0] : sp.x - 6,
      z: start ? start[2] : sp.z + 6,
      yaw: 0,
    };
  }, [start]);

  const { camera } = useThree();
  const camDirTmp = useRef(new THREE.Vector3());

  useEffect(() => {
    worldApi.playerBodyRef = bodyRef;
    return () => {
      worldApi.playerBodyRef = null;
    };
  }, []);

  const yawRef = useRef(spawn.yaw);
  const speedRef = useRef(0);
  const animRef = useRef(0);
  const groundedRef = useRef(false);
  const placed = useRef(false);

  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e2b98f", roughness: 0.75 }), []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3d6ea5", roughness: 0.8 }), []);
  const pants = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2e3a46", roughness: 0.9 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1d2024", roughness: 0.7 }), []);

  useFrame((_, rawDt) => {
    const dt = clamp(rawDt, 0, 0.05);
    const s = useGame.getState();
    const body = bodyRef.current;
    if (!body) return;

    if (s.phase === "menu" || s.phase === "paused") {
      if (!placed.current) {
        const g = groundHeightAt(spawn.x, spawn.z);
        body.setTranslation({ x: spawn.x, y: g + BODY_OFFSET, z: spawn.z }, true);
        placed.current = true;
      }
      return;
    }

    const t = body.translation();

    if (s.controlMode === "driving") {
      if (groupRef.current) groupRef.current.visible = false;
      const v = s.activeVehicleId ? worldApi.vehicles.get(s.activeVehicleId) : undefined;
      if (v) {
        if (t.y > -30) {
          body.setTranslation({ x: v.pos.x, y: -80, z: v.pos.z }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
        yawRef.current = v.yaw;
      }
      worldApi.player.pos.set(v ? v.pos.x : t.x, v ? v.pos.y : t.y, v ? v.pos.z : t.z);
      worldApi.player.yaw = v ? v.yaw : yawRef.current;
      worldApi.player.moving = v ? Math.abs(v.speed) : 0;
      if (input.justPressed("enter")) {
        exitVehicle(s, body, v);
      }
      return;
    }

    if (groupRef.current) groupRef.current.visible = true;

    if (!placed.current) {
      const g = groundHeightAt(spawn.x, spawn.z);
      body.setTranslation({ x: spawn.x, y: g + BODY_OFFSET, z: spawn.z }, true);
      placed.current = true;
    }

    const fwd = input.axis("forward", "back");
    const side = input.axis("right", "left");
    const run = input.is("run");
    const jump = input.justPressed("jump");
    const mag = Math.min(Math.hypot(fwd, side), 1);

    const grounded = t.y - (groundHeightAt(t.x, t.z) + BODY_OFFSET) < 0.09;
    groundedRef.current = grounded;

    // camera-relative movement: camera forward projected on the ground plane
    const camDir = camDirTmp.current.set(0, 0, 1);
    camera.getWorldDirection(camDir);
    let cfx = camDir.x;
    let cfz = camDir.z;
    const clen = Math.hypot(cfx, cfz);
    if (clen < 0.001) {
      cfx = 0;
      cfz = 1;
    } else {
      cfx /= clen;
      cfz /= clen;
    }
    const rx = -cfz;
    const rz = cfx;
    const mx = fwd * cfx + side * rx;
    const mz = fwd * cfz + side * rz;

    const maxSpeed = mag > 0.05 ? (run ? RUN_SPEED : WALK_SPEED) * mag : 0;
    const accel = run ? ACCEL_RUN : ACCEL_WALK;
    let speed = speedRef.current;
    if (mag > 0.05) {
      const lim = grounded ? 1 : AIR_ACCEL_SCALE;
      speed += clamp(maxSpeed - speed, -BRAKE * dt, accel * lim * dt);
    } else {
      speed += clamp(0 - speed, -BRAKE * dt, BRAKE * dt);
      if (Math.abs(speed) < 0.04) speed = 0;
    }
    speedRef.current = speed;

    if (mag > 0.05) {
      const targetYaw = Math.atan2(mx, mz);
      yawRef.current = smoothYaw(yawRef.current, targetYaw, dt, grounded ? 13 : 6);
    }

    const dirLen = Math.hypot(mx, mz);
    const udx = dirLen > 0.001 ? mx / dirLen : 0;
    const udz = dirLen > 0.001 ? mz / dirLen : 0;
    const vx = udx * speed;
    const vz = udz * speed;
    const lv = body.linvel();
    worldApi.player.vel.set(lv.x, lv.y, lv.z);
    const currentVy = grounded ? Math.min(lv.y, 0) : lv.y;
    let ny = currentVy;
    if (grounded && jump) {
      body.setTranslation({ x: t.x, y: t.y + 0.07, z: t.z }, true);
      ny = JUMP_VELOCITY;
    }
    body.setLinvel({ x: vx, y: ny, z: vz }, true);

    if (input.justPressed("enter")) {
      const v = findNearestVehicle(t.x, t.z, true, 3.4);
      if (v) {
        worldApi.player.onFoot = false;
        s.setControlMode("driving");
        s.setActiveVehicle(v.id, v.name, v.class);
        s.notify(`Entered ${v.name}`);
        worldApi.player.pos.set(v.pos.x, v.pos.y, v.pos.z);
        worldApi.player.yaw = v.yaw;
        return;
      }
    }

    worldApi.player.pos.set(t.x, t.y, t.z);
    worldApi.player.yaw = yawRef.current;
    worldApi.player.moving = Math.abs(speed);
    worldApi.player.grounded = grounded;
    worldApi.player.speed = Math.abs(speed);

    if (groupRef.current) {
      groupRef.current.position.set(t.x, t.y - BODY_OFFSET, t.z);
      groupRef.current.rotation.y = yawRef.current + Math.PI;
    }

    const moving = Math.abs(speed) > 0.1;
    if (moving) animRef.current += dt * (run ? 1.8 : 1.1);
    const phase = animRef.current;
    const swing = Math.sin(phase * 2) * (moving ? 0.55 : 0);
    const bob = Math.abs(Math.cos(phase)) * (moving ? 0.045 : 0);

    if (torsoRef.current) {
      torsoRef.current.position.y = 0.66 + bob;
      torsoRef.current.rotation.x = moving ? -0.05 : Math.sin(phase * 0.5) * 0.02;
    }
    if (headRef.current) headRef.current.position.y = 0.4 + bob;
    if (legLRef.current) legLRef.current.rotation.x = swing;
    if (legRRef.current) legRRef.current.rotation.x = -swing;
    if (armLRef.current) armLRef.current.rotation.x = -swing * 0.8;
    if (armRRef.current) armRRef.current.rotation.x = swing * 0.8;
  });

  const g = groundHeightAt(spawn.x, spawn.z);

  return (
    <group name="player">
      <RigidBody
        ref={bodyRef}
        type="dynamic"
        colliders={false}
        position={[spawn.x, g + BODY_OFFSET, spawn.z]}
        enabledRotations={[false, false, false]}
        canSleep={false}
        ccd
        linearDamping={0.4}
        angularDamping={2}
        userData={{ player: true }}
      >
        <CapsuleCollider args={[CAPSULE_HALF, CAPSULE_RADIUS]} friction={0.5} restitution={0} contactSkin={0.02} />
      </RigidBody>
      <group ref={groupRef} position={[spawn.x, g, spawn.z]}>
        <mesh ref={legLRef} material={pants} position={[-0.13, 0.7, 0]}>
          <boxGeometry args={[0.16, 0.72, 0.2]} />
        </mesh>
        <mesh ref={legRRef} material={pants} position={[0.13, 0.7, 0]}>
          <boxGeometry args={[0.16, 0.72, 0.2]} />
        </mesh>
        <group ref={torsoRef} position={[0, 0.66, 0]}>
          <mesh material={cloth} position={[0, 0.3, 0]}>
            <boxGeometry args={[0.42, 0.58, 0.3]} />
          </mesh>
          <mesh ref={armLRef} material={cloth} position={[-0.28, 0.16, 0]}>
            <boxGeometry args={[0.13, 0.46, 0.16]} />
          </mesh>
          <mesh ref={armRRef} material={cloth} position={[0.28, 0.16, 0]}>
            <boxGeometry args={[0.13, 0.46, 0.16]} />
          </mesh>
          <mesh material={dark} position={[0, 0, 0.16]}>
            <boxGeometry args={[0.4, 0.4, 0.06]} />
          </mesh>
        </group>
        <group ref={headRef} position={[0, 0.4, 0]}>
          <mesh material={skin}>
            <sphereGeometry args={[0.22, 16, 16]} />
          </mesh>
          <mesh material={dark} position={[0, 0.1, -0.12]}>
            <boxGeometry args={[0.26, 0.16, 0.2]} />
          </mesh>
          <mesh material={skin} position={[0, -0.06, 0]}>
            <boxGeometry args={[0.2, 0.12, 0.24]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function exitVehicle(s: ReturnType<typeof useGame.getState>, body: any, v?: import("@/types/game").RuntimeVehicle) {
  let ex = { x: 0, z: 0 };
  if (v) {
    ex = exitVehiclePosition(v.pos.x, v.pos.z, v.yaw);
  } else {
    const t = body.translation();
    ex = { x: t.x, z: t.z };
  }
  const gy = groundHeightAt(ex.x, ex.z);
  body.setTranslation({ x: ex.x, y: gy + BODY_OFFSET, z: ex.z }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  worldApi.player.onFoot = true;
  s.setActiveVehicle(null, null, null);
  s.setControlMode("on-foot");
  s.setSpeed(0);
  s.notify("Left vehicle");
}