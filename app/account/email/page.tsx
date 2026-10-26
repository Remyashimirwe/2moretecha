import ServiceUnavailable from "@/components/service-unavailable";
export const metadata = { title: "Business email" };
export default function EmailPage() {
  return <ServiceUnavailable title="Business email" description="Mailbox, subscription and renewal details will appear here when an email provider is connected." />;
}
