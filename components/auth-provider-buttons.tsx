import { signIn } from "@/auth";

function safeDestination(destination: string) {
  return destination.startsWith("/") && !destination.startsWith("//")
    ? destination
    : "/account";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.6-4.1H3.05v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.94a6 6 0 0 1 0-3.88v-2.6H3.05a10 10 0 0 0 0 9.08l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.96c1.47 0 2.8.5 3.84 1.52l2.88-2.88C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.95 5.46l3.35 2.6c.8-2.35 3-4.1 5.6-4.1Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.08c-3.1.67-3.75-1.32-3.75-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.67.08-.67 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.92.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.12-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.61 5.24-5.1 5.52.4.34.75 1 .75 2.03V22c0 .29.2.63.76.52A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}

export default function AuthProviderButtons({
  redirectTo = "/account",
}: {
  redirectTo?: string;
}) {
  const destination = safeDestination(redirectTo);

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: destination });
  }

  async function signInWithGitHub() {
    "use server";
    await signIn("github", { redirectTo: destination });
  }

  const buttonClass =
    "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy-950 shadow-md shadow-black/15 transition-all hover:-translate-y-0.5 hover:border-light-blue hover:bg-light-blue hover:shadow-lg hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-blue";

  return (
    <div className="mt-7 grid gap-3">
      <form action={signInWithGoogle}>
        <button className={buttonClass} type="submit">
          <GoogleIcon />
          Continue with Google
        </button>
      </form>
      <form action={signInWithGitHub}>
        <button className={buttonClass} type="submit">
          <GitHubIcon />
          Continue with GitHub
        </button>
      </form>
    </div>
  );
}
