"use client";

import * as THREE from "three";
import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useGame } from "@/store/gameStore";
import { worldApi } from "@/lib/worldApi";

export function DayNightCycle() {
  const { scene, gl } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const sunMesh = useRef<THREE.Mesh>(null);
  const [showStars, setShowStars] = useState(true);

  const skyUniforms = useMemo(() => {
    return {
      topDay: new THREE.Color("#2f6fc4"),
      topNight: new THREE.Color("#060a18"),
      midDay: new THREE.Color("#9fc6e8"),
      midNight: new THREE.Color("#0a1128"),
      bottomDay: new THREE.Color("#e8d9a8"),
      bottomNight: new THREE.Color("#0d1426"),
      sunDir: new THREE.Vector3(0, 1, 0),
      sunColor: new THREE.Color("#fff6d8"),
      sunPower: 0.0,
      moonDir: new THREE.Vector3(0, -1, 0),
      moonPower: 0.0,
    };
  }, []);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: skyUniforms.topDay },
          uMid: { value: skyUniforms.midDay },
          uBottom: { value: skyUniforms.bottomDay },
          uSunDir: { value: skyUniforms.sunDir },
          uSunColor: { value: skyUniforms.sunColor },
          uSunPower: { value: 0 },
          uMoonDir: { value: skyUniforms.moonDir },
          uMoonPower: { value: 0 },
        },
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vWorldPos;
          uniform vec3 uTop;
          uniform vec3 uMid;
          uniform vec3 uBottom;
          uniform vec3 uSunDir;
          uniform vec3 uSunColor;
          uniform float uSunPower;
          uniform vec3 uMoonDir;
          uniform float uMoonPower;
          void main() {
            vec3 dir = normalize(vWorldPos);
            float h = clamp(dir.y, -0.12, 1.0);
            float t = pow(h, 0.45);
            vec3 col = mix(uBottom, uMid, smoothstep(0.0, 0.4, t));
            col = mix(col, uTop, smoothstep(0.42, 0.95, t));
            float sunDot = max(dot(dir, uSunDir), 0.0);
            float sunDisc = smoothstep(0.9985, 0.9994, sunDot);
            col += uSunColor * sunDisc * (0.5 + 1.5 * uSunPower);
            col += uSunColor * pow(sunDot, 90.0) * 0.35 * uSunPower;
            float moonDot = max(dot(dir, uMoonDir), 0.0);
            float moonDisc = smoothstep(0.9990, 0.9996, moonDot);
            col += vec3(0.9, 0.95, 1.0) * moonDisc * uMoonPower;
            float glow = pow(moonDot, 24.0) * uMoonPower * 0.2;
            col += vec3(0.8, 0.9, 1.0) * glow;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [skyUniforms]
  );

  const skyGeo = useMemo(() => new THREE.SphereGeometry(880, 24, 16), []);

  useFrame(() => {
    const s = useGame.getState();
    const t = s.dayTime;

    // sun elevation: dayTime 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight
    const sunAngle = t * Math.PI * 2 - Math.PI / 2;
    const elevation = Math.sin(sunAngle);
    const azimuth = Math.PI * 0.9 + t * Math.PI * 2 * 0.15;
    const sunDir = new THREE.Vector3(Math.cos(azimuth) * 0.7, elevation * 1.1, Math.sin(azimuth) * 0.7).normalize();

    const dayF = THREE.MathUtils.smoothstep(elevation, -0.12, 0.35);
    const nightF = 1 - THREE.MathUtils.smoothstep(elevation, -0.28, 0.12);
    const sunsetF = Math.pow(Math.sin(sunAngle), 24) * 3.2;

    // sun disc position
    if (sunMesh.current) sunMesh.current.position.copy(sunDir).multiplyScalar(640);

    skyUniforms.sunDir.copy(sunDir);
    skyUniforms.moonDir.set(-sunDir.x, -sunDir.y, -sunDir.z);
    skyUniforms.sunPower = dayF;
    skyUniforms.moonPower = nightF;

    skyUniforms.topDay.setHSL(0.58, 0.62, 0.42 + dayF * 0.22 + sunsetF * 0.06);
    skyUniforms.midDay.setHSL(0.56, 0.5, 0.62 + dayF * 0.22 + sunsetF * 0.12);
    skyUniforms.bottomDay.setHSL(0.1, 0.65, 0.68 + dayF * 0.14 + sunsetF * 0.18);
    skyUniforms.topNight.setHSL(0.63, 0.5, 0.06 + nightF * 0.04);
    skyUniforms.midNight.setHSL(0.62, 0.4, 0.1 + nightF * 0.03);
    skyUniforms.bottomNight.setHSL(0.05, 0.35, 0.08 + nightF * 0.02);

    skyMat.uniforms.uTop.value.copy(skyUniforms.topDay).lerp(skyUniforms.topNight, nightF);
    skyMat.uniforms.uMid.value.copy(skyUniforms.midDay).lerp(skyUniforms.midNight, nightF);
    skyMat.uniforms.uBottom.value.copy(skyUniforms.bottomDay).lerp(skyUniforms.bottomNight, nightF);
    skyMat.uniforms.uSunColor.value.setHSL(0.12, 0.9, 0.72).lerp(new THREE.Color("#fff7e0"), dayF);
    skyMat.uniforms.uSunPower.value = dayF;
    skyMat.uniforms.uMoonPower.value = nightF;

    // directional light
    if (sun.current) {
      sun.current.position.copy(sunDir).multiplyScalar(180);
      sun.current.intensity = 0.15 + dayF * 1.7 + sunsetF * 0.35;
      sun.current.color.setHSL(0.1, 0.55, 0.85 - sunsetF * 0.3);
    }

    // hemi ambient
    scene.traverse((obj) => {
      if (obj instanceof THREE.HemisphereLight) {
        obj.intensity = 0.25 + dayF * 0.65 + nightF * 0.08;
      }
    });

    // fog
    const fog = scene.fog as THREE.Fog | undefined;
    if (fog) {
      fog.color.setHSL(0.58, 0.4, 0.28 + dayF * 0.42 + nightF * 0.02);
    }
    gl.toneMappingExposure = 0.85 + dayF * 0.35 + sunsetF * 0.1;

    // city glow
    for (const g of worldApi.cityGlow) {
      g.mat.emissiveIntensity = nightF * g.base;
    }

    // stars visibility
    if (nightF > 0.5 && !showStars) setShowStars(true);
    if (nightF <= 0.45 && showStars) setShowStars(false);
  });

  return (
    <group>
      <mesh geometry={skyGeo} material={skyMat} renderOrder={-10} />
      <mesh ref={sunMesh}>
        <sphereGeometry args={[6, 12, 12]} />
        <meshBasicMaterial color="#ffdf8e" />
      </mesh>
      <directionalLight ref={sun} position={[120, 160, 60]} intensity={1.5} color="#fff2d8" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-160} shadow-camera-right={160} shadow-camera-top={160} shadow-camera-bottom={-160} shadow-camera-far={600} />
      <hemisphereLight args={["#cfe3ff", "#3a3f4a", 0.6]} />
      {showStars && <Stars radius={600} depth={120} count={1600} factor={5} fade speed={0.4} />}
    </group>
  );
}