// Every page under the signed-in part of the app starts by calling this.
// It sends anyone who isn't logged in back to /sign-in, so individual
// pages never have to think about the "logged out" case themselves.

import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  return { supabase, user };
}
