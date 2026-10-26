"use client";

/**
 * Compact five-item service strip on a white surface. Each item mirrors a
 * 3D element: hovering nudges the matching object in the hero scene.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Code2, Globe, Mail, Server, ShieldCheck } from "lucide-react";
import type { ServiceKey } from "./types";

const SERVICES = [
  {
    id: "webnexa-domains",
    icon: Globe,
    title: "Domain Registration",
    body: "Find the right name for your business.",
    service: "domains" as ServiceKey,
  },
  {
    id: "webnexa-hosting",
    icon: Server,
    title: "Reliable Hosting",
    body: "Keep your website online.",
    service: "hosting" as ServiceKey,
  },
  {
    id: "webnexa-builder",
    icon: Code2,
    title: "Website Development",
    body: "Turn your ideas into a real website.",
    service: "builder" as ServiceKey,
  },
  {
    id: "webnexa-email",
    icon: Mail,
    title: "Business Email",
    body: "Look professional with your own email.",
    service: "email" as ServiceKey,
  },
  {
    id: "webnexa-security",
    icon: ShieldCheck,
    title: "Website Security",
    body: "Protect your website with the right security tools.",
    service: "security" as ServiceKey,
  },
];

export default function ServiceStrip({
  onHover,
}: {
  onHover: (service: ServiceKey | null) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section id="webnexa-services" className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <h2 className="sr-only">What WebNexa offers</h2>
        <ul className="grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {SERVICES.map((item, index) => (
            <motion.li
              key={item.id}
              id={item.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : index * 0.06 }}
              onMouseEnter={() => onHover(item.service)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(item.service)}
              onBlur={() => onHover(null)}
              tabIndex={0}
              className="group scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 outline-none transition-all duration-200 hover:-translate-y-1 hover:border-[#7BBDE8] hover:shadow-[0_18px_36px_-24px_rgba(10,65,116,0.55)] focus-visible:ring-2 focus-visible:ring-[#0A4174]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EDF4FF] text-[#0A4174] transition-colors group-hover:bg-[#0A4174] group-hover:text-white">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-[#001D39]">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#49769F]">{item.body}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
