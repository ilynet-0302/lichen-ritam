export type Section = { id: string; heading: string; body: string };
export type EntryKind = "journal" | "article";
export type Entry = {
  id: string;
  kind?: EntryKind;
  date: string;
  title: string;
  training: boolean;
  training_note: string;
  food: string;
  sections: Section[];
  before_photo: string | null;
  after_photo: string | null;
  extra_photos?: string[];
  status: "draft" | "published";
  updated_at: string;
};
export type Settings = {
  id: number;
  intro: string;
  start_date: string;
  baseline_photo: string | null;
};
export type JournalData = { entries: Entry[]; settings: Settings };

// Entries saved before articles were introduced remain ordinary journal days.
export const isArticle = (entry: Entry) => entry.kind === "article";
export const articlePhotos = (entry: Entry) =>
  [...new Set([entry.before_photo, entry.after_photo, ...(entry.extra_photos ?? [])]
    .filter((path): path is string => Boolean(path)))];
export function entrySections(kind: EntryKind): Section[] {
  return (kind === "article" ? [""] : ["Преди да тръгна", "Между сериите", "След тренировката"])
    .map((heading) => ({ id: crypto.randomUUID(), heading, body: "" }));
}
export function changeEntryKind(entry: Entry, kind: EntryKind): Entry {
  const currentKind = isArticle(entry) ? "article" : "journal";
  if (kind === currentKind) return entry;
  const defaults = entrySections(currentKind);
  const untouched = entry.sections.length === defaults.length &&
    entry.sections.every((section, index) =>
      !section.body.trim() && section.heading === defaults[index].heading);
  // Keep all authored text, photos and day details when changing presentation.
  return { ...entry, kind, sections: untouched ? entrySections(kind) : entry.sections };
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function dayNumber(date: string, start: string) {
  return Math.max(
    1,
    Math.round((Date.parse(date) - Date.parse(start)) / 86400000) + 1,
  );
}
export function formatDate(date: string, weekday = false) {
  return new Intl.DateTimeFormat(
    "bg-BG",
    weekday
      ? { weekday: "long", timeZone: "UTC" }
      : { day: "2-digit", month: "long", timeZone: "UTC" },
  ).format(new Date(`${date}T12:00:00Z`));
}
export const publishedEntries = (entries: Entry[]) =>
  entries
    .filter((e) => e.status === "published")
    .sort((a, b) => a.date.localeCompare(b.date));
export function newEntry(kind: EntryKind = "journal"): Entry {
  return {
    id: crypto.randomUUID(),
    kind,
    date: today(),
    title: "",
    training: kind === "journal",
    training_note: "",
    food: "",
    sections: entrySections(kind),
    before_photo: null,
    after_photo: null,
    extra_photos: [],
    status: "draft",
    updated_at: new Date().toISOString(),
  };
}
export function validateEntry(
  entry: Entry,
  entries: Entry[],
  start: string,
): string | null {
  if (!validDate(entry.date)) return "Избери валидна дата.";
  if (entry.date < start)
    return "Датата е преди началото на дневника. Промени датата или началото в настройките.";
  if (entries.some((e) => e.id !== entry.id && e.date === entry.date))
    return "Вече има запис за тази дата. Отвори него или избери друга дата.";
  if (!entry.title.trim()) return isArticle(entry) ? "Дай заглавие на статията." : "Дай заглавие на деня.";
  if (entry.title.length > 180) return "Съкрати заглавието до 180 знака.";
  if (
    entry.status === "published" &&
    !entry.sections.some((s) => s.body.trim())
  )
    return "Добави поне малко текст, преди да публикуваш записа.";
  return null;
}
