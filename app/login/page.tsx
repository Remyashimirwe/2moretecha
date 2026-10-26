import AuthPage from "@/components/auth-page";

export const metadata = { title: "Log in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
