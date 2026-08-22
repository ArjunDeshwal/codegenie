"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ShaderScene = dynamic(() => import("./shader-gradient-scene").then((module) => module.ShaderGradientScene), {
  ssr: false,
  loading: () => <div className="size-full bg-[radial-gradient(circle_at_20%_30%,#765f8f_0%,#35466d_42%,#172e34_100%)]" />,
});

const Fallback = () => <div className="size-full bg-[radial-gradient(circle_at_20%_30%,#765f8f_0%,#35466d_42%,#172e34_100%)]" />;

const ShaderGradientBackground = () => {
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    if (media.matches) return;
    const idle = window.requestIdleCallback?.(() => setReady(true), { timeout: 1_500 });
    const timer = idle === undefined ? window.setTimeout(() => setReady(true), 600) : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return ready && !reducedMotion ? <ShaderScene /> : <Fallback />;
};

export { ShaderGradientBackground };
