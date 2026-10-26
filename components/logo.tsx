import Link from "next/link";
import Image from "next/image";

/**
 * 2-MoreTechs logo — flat, two variants:
 *  - "light": for the Deep Blue navbar (light-blue mark, white wordmark)
 *  - "dark":  for light surfaces like the footer (deep-blue mark, dark wordmark)
 */
export default function Logo({
  variant = "dark",
}: {
  variant?: "light" | "dark";
}) {
  const onDark = variant === "light";
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5"
      aria-label="2-MoreTechs home"
    >
      <Image
        src="/logo.png"
        alt=""
        width={40}
        height={40}
        className="h-9 w-9 rounded-xl object-cover ring-1 ring-inset ring-slate-200"
      />
      <span
        className={`text-lg font-semibold tracking-tight ${
          onDark ? "text-white" : "text-navy-950"
        }`}
      >
        2
        <span className={onDark ? "text-light-blue" : "text-deep-blue"}>More</span>
        Techs
      </span>
    </Link>
  );
}
