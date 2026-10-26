/**
 * Shared helpers for the site's name + extension search bars
 * (homepage hero and /domains) so both build identical queries.
 *
 * Query rules understood by GET /api/domains/search:
 *  - contains "."      → exact availability check for that domain
 *  - bare keyword      → availability check across the default extensions
 */

/** Build the registrar query from the typed name and picked extension. */
export function buildDomainQuery(raw: string, tld: string | null): string | null {
  const q = raw.trim();
  if (!q) return null;
  if (q.includes(".")) return q; // full domain typed → exact search
  if (tld) return `${q}.${tld}`; // extension chosen → exact search
  return q; // bare keyword → multi-extension search
}

/**
 * Client-side validation before we hit the API.
 * The server re-validates regardless — this only shapes fast feedback.
 */
export function validateDomainInput(raw: string, tldChosen: boolean): string | null {
  const q = raw.trim();
  if (!q) return "Type a domain name to start your search.";
  if (/\s/.test(q)) return "Domain names can’t contain spaces.";
  if (q.includes(".")) {
    const dot = q.lastIndexOf(".");
    const name = q.slice(0, dot);
    const ext = q.slice(dot + 1);
    if (!name || ext.length < 2) {
      return "That doesn’t look like a complete domain — e.g. mybusiness.com";
    }
    return null;
  }
  const min = tldChosen ? 2 : 3;
  if (q.length < min) {
    return tldChosen
      ? "Enter at least 2 characters for the domain name."
      : "Enter at least 3 characters — e.g. mybusiness";
  }
  return null;
}
