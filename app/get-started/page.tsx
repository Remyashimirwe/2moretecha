import AuthPage from "@/components/auth-page";

export const metadata = { title: "Get started", robots: { index: false, follow: false } };

export default function GetStartedPage() {
  return <AuthPage mode="get-started" />;
}
