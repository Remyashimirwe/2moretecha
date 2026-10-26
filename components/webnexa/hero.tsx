"use client";

/**
 * WebNexa hero: badge, headline, description, the live domain-search form,
 * three trust benefits and the lazy 3D scene. All search state lives here so
 * the form and the scene always tell the same story.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Headphones, ShieldCheck, Zap } from "lucide-react";
import DomainSearch from "./domain-search";
import SceneLoader from "./scene/scene-loader";
import type { SceneState } from "./types";

const BENEFITS = [
  { icon: ShieldCheck, label: "Secure Transactions" },
  { icon: Zap, label: "Simple Setup" },
  { icon: Headphones, label: "Reliable Support" },
] as const;

export default function Hero({
  scene,
  onSceneChange,
}: {
  scene: SceneState;
  onSceneChange: (patch: Partial<SceneState>) => void;
}) {
  const reduceMotion = useReducedMotion();
  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="relative isolate overflow-hidden bg-[#001D39]">
      {/* Subtle blue wash on deep navy — no busy gradients, just depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_620px_at_78%_16%,rgba(10,65,116,0.85),transparent_62%),radial-gradient(900px_520px_at_6%_90%,rgba(78,142,162,0.32),transparent_64%),linear-gradient(180deg,#001D39_0%,#00264c_48%,#001D39_100%)]"
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:pb-24">
        {/* ── Left: copy + search ─────────────────────────── */}
        <div className="max-w-2xl">
          <motion.p
            {...rise(0)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium tracking-wide text-[#BDD8E9]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#7BBDE8]" aria-hidden />
            Your Online Journey Starts Here
          </motion.p>

          <motion.h1
            {...rise(0.06)}
            className="mt-6 text-[clamp(2.3rem,5.6vw,4.15rem)] font-semibold leading-[1.05] tracking-tight text-white"
          >
            Your Business Deserves a{" "}
            <span className="bg-gradient-to-r from-[#7BBDE8] via-[#6EA2B3] to-[#BDD8E9] bg-clip-text text-transparent">
              Place Online
            </span>
            .
          </motion.h1>

          <motion.p {...rise(0.12)} className="mt-5 max-w-xl text-base leading-7 text-[#BDD8E9] sm:text-lg sm:leading-8">
            Find your perfect domain, launch your website, and keep your online presence secure
            — all in one place.
          </motion.p>

          <motion.div {...rise(0.18)} className="mt-8">
            <DomainSearch onChange={onSceneChange} />
          </motion.div>

          <motion.ul
            {...rise(0.26)}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3"
            aria-label="Why people choose WebNexa"
          >
            {BENEFITS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2 text-sm text-[#BDD8E9]">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/5 text-[#7BBDE8]">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* ── Right: interactive 3D scene ─────────────────── */}
        <div className="relative mx-auto w-full max-w-[640px] lg:max-w-none">
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/11] lg:aspect-square">
            <SceneLoader state={scene} />
          </div>
        </div>
      </div>
    </section>
  );
}
