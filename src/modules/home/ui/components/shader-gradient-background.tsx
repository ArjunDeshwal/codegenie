"use client";

import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";

const ShaderGradientBackground = () => (
  <ShaderGradientCanvas
    className="codegenie-shader-gradient"
    fov={45}
    lazyLoad
    pixelDensity={1}
    pointerEvents="none"
    powerPreference="high-performance"
  >
    <ShaderGradient
      animate="on"
      brightness={0.9}
      cAzimuthAngle={180}
      cDistance={3.6}
      cPolarAngle={90}
      cameraZoom={1}
      color1="#a985c8"
      color2="#667fbe"
      color3="#58a6ad"
      control="props"
      envPreset="city"
      grain="on"
      lightType="3d"
      positionX={-1.4}
      positionY={0}
      positionZ={0}
      reflection={0.06}
      rotationX={0}
      rotationY={10}
      rotationZ={50}
      shader="defaults"
      type="plane"
      uAmplitude={0.45}
      uDensity={1}
      uFrequency={3.4}
      uSpeed={0.055}
      uStrength={1.45}
      uTime={0}
    />
  </ShaderGradientCanvas>
);

export { ShaderGradientBackground };
