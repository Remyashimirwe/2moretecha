import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

export async function requireAccountUser() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) redirect("/login?next=%2Faccount");

  const user = await getPrisma().user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (!user) redirect("/login?next=%2Faccount");

  return {
    id: user.id,
    email: user.email ?? email,
    name: user.name?.trim() || email.split("@")[0],
    passwordHash: user.passwordHash,
  };
}
