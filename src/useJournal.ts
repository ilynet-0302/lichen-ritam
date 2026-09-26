import { useCallback, useEffect, useRef, useState } from "react";
import type { Entry, JournalData, Settings } from "./model";
import {
  deleteCloudEntry,
  fetchJournal,
  photoUrls,
  saveCloudEntry,
  saveCloudSettings,
  supabase,
} from "./cloud";

export function useJournal() {
  const [data, setData] = useState<JournalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(supabase));
  const [userId, setUserId] = useState<string | null | undefined>(
    supabase ? undefined : null,
  );
  const [owner, setOwner] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data: session, error }) => {
        if (!active) return;
        if (error) throw error;
        setUserId(session.session?.user.id ?? null);
      })
      .catch(() => {
        if (active) {
          setError("Входът не можа да бъде проверен. Презареди страницата.");
          setLoading(false);
        }
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const reload = useCallback(async () => {
    const id = ++request.current;
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (userId === undefined) return;
    setLoading(true);
    setError("");
    setAuthReady(false);
    try {
      let allowed = false;
      if (supabase && userId) {
        const result = await supabase
          .rpc("is_owner")
          .abortSignal(AbortSignal.timeout(15000));
        if (result.error) throw result.error;
        allowed = result.data === true;
      }
      const loaded = await fetchJournal();
      if (id === request.current) {
        setData(loaded);
        setOwner(allowed);
        setAuthReady(true);
      }
    } catch {
      if (id === request.current) {
        setData(null);
        setError(
          "В момента не можем да заредим записите. Опитай отново след малко.",
        );
      }
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    void reload();
  }, [reload]);

  async function save(entry: Entry) {
    if (!data || !owner)
      throw new Error("Влез отново, за да запазиш.");
    const updated = {
      ...entry,
      title: entry.title.trim(),
      updated_at: new Date().toISOString(),
    };
    const next = {
      ...data,
      entries: [...data.entries.filter((e) => e.id !== entry.id), updated].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    };
    await saveCloudEntry(updated);
    setData(next);
  }
  async function saveSettings(settings: Settings) {
    if (!data || !owner)
      throw new Error("Влез отново, за да запазиш.");
    const next = { ...data, settings };
    await saveCloudSettings(settings);
    setData(next);
  }
  async function remove(id: string) {
    if (!data || !owner)
      throw new Error("Влез отново, за да изтриеш.");
    const next = { ...data, entries: data.entries.filter((e) => e.id !== id) };
    await deleteCloudEntry(id);
    setData(next);
  }
  async function signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setOwner(false);
  }
  return {
    data,
    loading,
    error,
    reload,
    owner,
    userId,
    authReady,
    save,
    saveSettings,
    remove,
    signOut,
  };
}

export function usePhotoUrls(data: JournalData | null) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    const paths = data
      ? [
          ...data.entries.flatMap((e) => [
            e.before_photo,
            e.after_photo,
            ...(e.extra_photos ?? []),
          ]),
          data.settings.baseline_photo,
        ].filter((p): p is string => Boolean(p))
      : [];
    const refresh = async () => {
      try {
        const resolved = await photoUrls(paths);
        if (active) setUrls(resolved);
      } catch {
        if (active) setUrls({});
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 240000);
    const wake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [data]);
  return urls;
}
