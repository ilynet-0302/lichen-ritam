import { createClient } from "@supabase/supabase-js";
import type { Entry, JournalData, Settings } from "./model";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const configurationError =
  Boolean(url) !== Boolean(key) ||
  Boolean(url && !/^https:\/\/[^/]+\/?$/.test(url));
export const supabase =
  !configurationError && url && key
    ? createClient(url, key, { auth: { flowType: "pkce" } })
    : null;
export async function fetchJournal(): Promise<JournalData> {
  if (!supabase) throw new Error("Missing configuration");
  const signal = AbortSignal.timeout(15000);
  const [entries, settings] = await Promise.all([
    supabase.from("entries").select("*").order("date").abortSignal(signal),
    supabase
      .from("journal_settings")
      .select("*")
      .eq("id", 1)
      .abortSignal(signal)
      .single(),
  ]);
  if (entries.error || settings.error) throw entries.error ?? settings.error;
  return {
    entries: entries.data as Entry[],
    settings: settings.data as Settings,
  };
}
export async function saveCloudEntry(entry: Entry) {
  const r = await supabase!
    .from("entries")
    .upsert({ ...entry, updated_at: new Date().toISOString() });
  if (r.error) throw r.error;
}
export async function saveCloudSettings(settings: Settings) {
  const r = await supabase!
    .from("journal_settings")
    .update(settings)
    .eq("id", 1)
    .select("id")
    .single();
  if (r.error) throw r.error;
}
export async function deleteCloudEntry(id: string) {
  const r = await supabase!
    .from("entries")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (r.error) throw r.error;
}
export async function uploadPhoto(blob: Blob): Promise<string> {
  const user = await supabase!.auth.getUser();
  if (!user.data.user) throw new Error("Session expired");
  const path = `${user.data.user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase!.storage
    .from("journal-photos")
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) throw error;
  return path;
}
export async function discardUploads(paths: string[]) {
  try {
    if (paths.length && supabase)
      await supabase.storage.from("journal-photos").remove(paths);
  } catch {
    /* An unavailable cleanup must not hide the original save error. */
  }
}
export async function photoUrls(
  paths: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const result: Record<string, string> = {};
  if (supabase && unique.length) {
    const { data, error } = await supabase.storage
      .from("journal-photos")
      .createSignedUrls(unique, 300);
    if (error) throw error;
    for (const item of data ?? [])
      if (item.path && item.signedUrl) result[item.path] = item.signedUrl;
  }
  return result;
}
export async function preparePhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Избери JPG, PNG или WebP снимка.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Снимката е над 20 MB. Избери по-малък файл.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Този браузър не успя да обработи снимката.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Опитай с друга снимка.")),
      "image/webp",
      0.85,
    ),
  );
}
export function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
