"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createLink, deleteLinkForUser } from "@/lib/links";

async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/login");
  }
  return { supabase, userId: data.user.id };
}

export async function createLinkAction(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const url = String(formData.get("url") ?? "");

  const result = await createLink(supabase, userId, url);
  if (!result.ok) {
    redirect("/dashboard?error=" + encodeURIComponent(result.error));
  }

  revalidatePath("/dashboard");
}

export async function deleteLinkAction(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const linkId = String(formData.get("linkId") ?? "");

  await deleteLinkForUser(supabase, userId, linkId);
  revalidatePath("/dashboard");
}
