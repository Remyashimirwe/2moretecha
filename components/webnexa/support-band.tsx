"use client";

/**
 * Support / conversion band — also the target of the header's "Support" link.
 */
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function SupportBand() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="webnexa-support" className="scroll-mt-24 bg-[#001D39]">
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: reduceMotion ? 0 : 0.55 }}
          className="flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Real people, ready to help you launch.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#BDD8E9] sm:text-base">
              Questions about a name, a migration or a security option? Our team answers
              every ticket — no bots, no queues.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              href="/get-started"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#7BBDE8] to-[#49769F] px-6 py-3 text-sm font-semibold text-[#001D39] transition hover:from-white hover:to-[#BDD8E9] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7BBDE8]/50"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/account/support"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7BBDE8]/40"
            >
              Support tickets
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
