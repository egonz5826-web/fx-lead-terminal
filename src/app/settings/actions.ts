"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function updateWeights(formData: FormData) {
  const volume = Number(formData.get("weight_volume"));
  const corridor = Number(formData.get("weight_corridor"));
  const growth = Number(formData.get("weight_growth"));

  if (
    [volume, corridor, growth].some((n) => Number.isNaN(n) || n < 0 || n > 100)
  ) {
    throw new Error("Weights must be numbers between 0 and 100.");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("settings")
    .update({
      weight_volume: volume / 100,
      weight_corridor: corridor / 100,
      weight_growth: growth / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/settings");
}
