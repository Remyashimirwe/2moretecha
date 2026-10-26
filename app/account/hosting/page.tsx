import ServiceUnavailable from "@/components/service-unavailable";
export const metadata = { title: "Web hosting" };
export default function HostingPage() {
  return <ServiceUnavailable title="Web hosting" description="Hosting plans, provisioning, usage and renewal details will appear here when a hosting provider is connected." />;
}
