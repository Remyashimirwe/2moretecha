import ServiceUnavailable from "@/components/service-unavailable";
export const metadata = { title: "SSL & security" };
export default function SecurityPage() {
  return <ServiceUnavailable title="SSL & security" description="Certificate status, installation and renewal details will appear here when a security provider is connected." />;
}
