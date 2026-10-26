/**
 * Shared types for the WebNexa landing page.
 *
 * The hero UI and the 3D scene are separate client components; this is the
 * small contract that keeps them in sync (React state only — the animation
 * loops themselves never call setState).
 */

/** Lifecycle of one domain search, mirrored on the laptop screen. */
export type SearchPhase = "idle" | "searching" | "available" | "unavailable" | "error";

/** The five services — used to link nav/strip hover to a 3D element. */
export type ServiceKey = "domains" | "hosting" | "builder" | "email" | "security";

export type SceneState = {
  phase: SearchPhase;
  /** Raw text in the search box (drives the laptop screen). */
  query: string;
  /** True while the search input has focus → the laptop highlights. */
  focused: boolean;
  /** Service currently hovered in the nav/strip → subtle 3D emphasis. */
  highlight: ServiceKey | null;
  /** Alternative domain, only ever set from a real availability response. */
  suggestion: string | null;
  /** "$15.00/yr" style label — only when the backend returned a price. */
  priceLabel: string | null;
};

export const INITIAL_SCENE_STATE: SceneState = {
  phase: "idle",
  query: "",
  focused: false,
  highlight: null,
  suggestion: null,
  priceLabel: null,
};
