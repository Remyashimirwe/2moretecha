"use client";

/**
 * Static fallback shown while the 3D scene loads, and permanently when WebGL
 * or motion is unavailable. Same story as the scene — globe, extensions,
 * laptop, rack, shield, cloud — drawn as SVG so it renders instantly and
 * costs nothing.
 */
export default function SceneFallback({ loading = false }: { loading?: boolean }) {
  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 640 480"
        className="h-full w-full"
        role="img"
        aria-label="Illustration of a globe connected to domain extensions, a laptop, a server rack and a security shield"
      >
        <defs>
          <radialGradient id="fb-globe" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#49769F" />
            <stop offset="55%" stopColor="#0A4174" />
            <stop offset="100%" stopColor="#001528" />
          </radialGradient>
          <radialGradient id="fb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7BBDE8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7BBDE8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fb-chip" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7BBDE8" />
            <stop offset="100%" stopColor="#4E8EA2" />
          </linearGradient>
        </defs>

        {/* atmosphere */}
        <circle cx="320" cy="232" r="196" fill="url(#fb-glow)" />

        {/* globe */}
        <circle cx="320" cy="232" r="132" fill="url(#fb-globe)" stroke="#7BBDE8" strokeOpacity="0.55" strokeWidth="2" />
        <g stroke="#BDD8E9" strokeOpacity="0.35" fill="none">
          <ellipse cx="320" cy="232" rx="132" ry="46" />
          <ellipse cx="320" cy="232" rx="132" ry="92" />
          <ellipse cx="320" cy="232" rx="52" ry="132" />
          <ellipse cx="320" cy="232" rx="104" ry="132" />
          <line x1="188" y1="232" x2="452" y2="232" />
        </g>
        {/* connection points */}
        <g fill="#FFFFFF">
          <circle cx="272" cy="176" r="5" />
          <circle cx="368" cy="212" r="5" />
          <circle cx="318" cy="304" r="5" />
          <circle cx="404" cy="284" r="4" />
        </g>
        <g stroke="#7BBDE8" strokeOpacity="0.8" strokeWidth="2" fill="none">
          <path d="M272 176 Q 330 140 368 212" />
          <path d="M368 212 Q 360 270 318 304" />
          <path d="M318 304 Q 370 320 404 284" />
        </g>

        {/* orbit */}
        <ellipse cx="320" cy="232" rx="228" ry="96" fill="none" stroke="#BDD8E9" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="10 12" transform="rotate(-16 320 232)" />

        {/* extension chips */}
        <g fontFamily="system-ui, sans-serif" fontSize="20" fontWeight="700">
          <g transform="translate(452 118) rotate(-10)">
            <rect width="104" height="44" rx="22" fill="url(#fb-chip)" />
            <text x="52" y="29" textAnchor="middle" fill="#001D39">.com</text>
          </g>
          <g transform="translate(96 168) rotate(8)">
            <rect width="104" height="44" rx="22" fill="#4E8EA2" />
            <text x="52" y="29" textAnchor="middle" fill="#FFFFFF">.net</text>
          </g>
          <g transform="translate(470 306) rotate(6)">
            <rect width="104" height="44" rx="22" fill="#6EA2B3" />
            <text x="52" y="29" textAnchor="middle" fill="#001D39">.org</text>
          </g>
          <g transform="translate(128 330) rotate(-8)">
            <rect width="126" height="44" rx="22" fill="#0A4174" stroke="#7BBDE8" strokeOpacity="0.6" />
            <text x="63" y="29" textAnchor="middle" fill="#BDD8E9">.co.tz</text>
          </g>
        </g>

        {/* laptop */}
        <g transform="translate(392 372)">
          <rect x="0" y="52" width="176" height="12" rx="6" fill="#A9BACB" />
          <rect x="14" y="-6" width="148" height="60" rx="6" fill="#0E1B2E" />
          <rect x="20" y="0" width="136" height="48" rx="4" fill="#F7F9FD" />
          <rect x="30" y="12" width="84" height="10" rx="5" fill="#BDD8E9" />
          <rect x="30" y="28" width="54" height="8" rx="4" fill="#7BBDE8" />
        </g>

        {/* server rack */}
        <g transform="translate(56 336)">
          <rect width="86" height="118" rx="10" fill="#16324D" stroke="#49769F" strokeOpacity="0.5" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(10 ${14 + i * 26})`}>
              <rect width="66" height="18" rx="4" fill="#0B2136" />
              <circle cx="56" cy="9" r="4" fill={i === 2 ? "#FBBF24" : "#4ADE80"} />
            </g>
          ))}
        </g>

        {/* shield */}
        <g transform="translate(74 74)">
          <path d="M46 0 L92 20 L92 56 Q92 88 46 106 Q0 88 0 56 L0 20 Z" fill="#0A4174" stroke="#7BBDE8" strokeOpacity="0.7" strokeWidth="3" />
          <rect x="32" y="46" width="28" height="24" rx="5" fill="#BDD8E9" />
          <path d="M37 46 v-8 a9 9 0 0 1 18 0 v8" fill="none" stroke="#BDD8E9" strokeWidth="6" />
        </g>

        {/* cloud + upload */}
        <g transform="translate(466 58)" fill="#BDD8E9">
          <circle cx="30" cy="34" r="20" />
          <circle cx="56" cy="28" r="24" />
          <circle cx="80" cy="36" r="18" />
          <rect x="26" y="36" width="60" height="18" rx="9" />
          <g stroke="#7BBDE8" strokeWidth="6" strokeLinecap="round" fill="none">
            <path d="M56 74 v24" />
            <path d="M46 84 l10 -10 l10 10" />
          </g>
        </g>
      </svg>

      {loading && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 text-xs font-medium text-[#BDD8E9]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#7BBDE8] border-t-transparent" aria-hidden />
          Loading interactive 3D experience…
        </div>
      )}
    </div>
  );
}
