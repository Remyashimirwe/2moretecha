/**
 * Hero illustration: a glass globe with a subtle network of nodes,
 * plus glass service cards. Pure static SVG/CSS — no runtime JS,
 * no external assets, no continuous animation (entrance only).
 * Dark-theme edition: light-blue lines over the Deep Blue page.
 */
const CARDS = [
  { label: "Domains", dot: "bg-light-blue", className: "right-0 top-8", delay: "rise-3" },
  { label: "Web Hosting", dot: "bg-brand-400", className: "left-0 top-1/3", delay: "rise-4" },
  { label: "SSL & Security", dot: "bg-white", className: "bottom-10 right-4", delay: "rise-5" },
] as const;

export default function GlobeIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs sm:max-w-sm lg:max-w-none">
      {/* Restrained blue ambient glow (static, layered) */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(181,216,236,0.35),rgba(181,216,236,0.1)_48%,transparent_72%)]"
      />

      {/* Glass sphere */}
      <div
        aria-hidden
        className="absolute inset-[10%] rounded-full border border-white/15 bg-white/8 shadow-[0_24px_60px_-24px_rgba(1,16,33,0.7),inset_0_2px_0_rgba(255,255,255,0.12)] ring-1 ring-white/5 backdrop-blur-2xl"
      />
      {/* Soft light reflection on the sphere */}
      <div
        aria-hidden
        className="absolute left-[22%] top-[16%] h-14 w-24 -rotate-12 rounded-full bg-white/15 blur-md"
      />

      {/* Network: meridians, latitudes, nodes, connections */}
      <svg
        viewBox="0 0 400 400"
        aria-hidden
        className="absolute inset-[10%] h-[80%] w-[80%]"
      >
        <g fill="none" stroke="#DCE7F5" strokeOpacity="0.3" strokeWidth="1.4">
          <circle cx="200" cy="200" r="170" />
          <ellipse cx="200" cy="200" rx="60" ry="170" />
          <ellipse cx="200" cy="200" rx="118" ry="170" />
          <ellipse cx="200" cy="200" rx="170" ry="62" />
          <ellipse cx="200" cy="200" rx="170" ry="118" />
        </g>

        {/* Connection arcs */}
        <g fill="none" stroke="#2563EB" strokeOpacity="0.7" strokeWidth="1.6">
          <path d="M120 128 Q 200 78 285 148" />
          <path d="M108 232 Q 170 292 252 268" strokeDasharray="5 6" />
          <path d="M285 148 Q 300 210 252 268" />
        </g>

        {/* Nodes */}
        <g>
          {[
            [120, 128],
            [285, 148],
            [108, 232],
            [252, 268],
            [198, 202],
          ].map(([cx, cy]) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="5.5"
              fill="#DCE7F5"
              stroke="#101C3A"
              strokeWidth="2"
            />
          ))}
          {[
            [165, 90],
            [310, 210],
            [150, 300],
          ].map(([cx, cy]) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="3.5"
              fill="#2563EB"
              stroke="#101C3A"
              strokeWidth="1.5"
            />
          ))}
        </g>
      </svg>

      {/* Floating glass service cards (entrance only, then static) */}
      {CARDS.map((card) => (
        <div
          key={card.label}
          className={`rise ${card.delay} liquid-panel absolute ${card.className} flex items-center gap-2 rounded-xl px-3 py-2`}
        >
          <span className={`h-2 w-2 rounded-full ${card.dot}`} aria-hidden />
          <span className="text-xs font-semibold text-light-blue">{card.label}</span>
        </div>
      ))}
    </div>
  );
}
