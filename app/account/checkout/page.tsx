import CheckoutFlow from "@/components/checkout-flow";

export const metadata = { title: "Checkout" };

export default function AccountCheckoutPage() {
  return (
    <section className="overflow-hidden rounded-3xl bg-brand-50">
      <CheckoutFlow />
    </section>
  );
}
