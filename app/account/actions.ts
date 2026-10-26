"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireAccountUser } from "@/lib/account";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, validPassword, verifyPassword } from "@/lib/email-auth";

export async function logOut() {
  await signOut({ redirectTo: "/" });
}

export async function updateDisplayName(formData: FormData) {
  const user = await requireAccountUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 100) redirect("/account/settings?error=invalid-name");

  await getPrisma().user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/account");
  redirect("/account/settings?saved=profile");
}

export async function changePassword(formData: FormData) {
  const user = await requireAccountUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  if (!user.passwordHash) redirect("/account/settings?error=password-unavailable");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    redirect("/account/settings?error=current-password");
  }
  if (!validPassword(newPassword)) redirect("/account/settings?error=weak-password");
  if (newPassword !== confirmation) redirect("/account/settings?error=password-mismatch");

  await getPrisma().user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  revalidatePath("/account/settings");
  redirect("/account/settings?saved=password");
}
