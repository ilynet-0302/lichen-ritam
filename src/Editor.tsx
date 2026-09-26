import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Entry, JournalData, Settings } from "./model";
import { formatDate, newEntry, validDate, validateEntry } from "./model";
import {
  blobDataUrl,
  discardUploads,
  preparePhoto,
  supabase,
  uploadPhoto,
} from "./cloud";
import { analyticsCode } from "./analytics";
import { Notice, Photo } from "./components";
import { ExtraPhotoEditor } from "./Gallery";
import type { ExtraPhotoDraft } from "./Gallery";
import { navigate, routeHref } from "./navigation";

export type PhotoChange = { blob: Blob; preview: string } | null;
function PhotoField({
  label,
  src,
  onChange,
  onBusy,
}: {
  label: string;
  src?: string;
  onChange: (photo: PhotoChange) => void;
  onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function select(file?: File) {
    if (!file) return;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const blob = await preparePhoto(file);
      onChange({ blob, preview: await blobDataUrl(blob) });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Снимката не се отвори. Опитай с JPG или PNG.",
      );
    } finally {
      setBusy(false);
      onBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="photo-field">
      <h3>{label}</h3>
      <Photo src={src} alt={label} />
      <label className="button secondary file-button">
        {busy ? "Обработване…" : src ? "Смени снимката" : "Добави снимка"}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={label}
          disabled={busy}
          onChange={(e) => void select(e.target.files?.[0])}
        />
      </label>
      {src && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => onChange(null)}
        >
          Премахни
        </button>
      )}
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const r = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (r.error) throw r.error;
      setPassword("");
    } catch {
      setError(
        "Входът не успя. Провери имейла, паролата и интернет връзката си.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" tabIndex={-1} className="narrow-page">
      <h2>Твоето място за писане.</h2>
      <p>
        Входът е само за автора на дневника. Читателите нямат нужда от
        профил.
      </p>
      <form onSubmit={login}>
        <label>
          Имейл
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Парола
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <Notice error>{error}</Notice>}
        <button disabled={busy} className="button">
          {busy ? "Влизане…" : "Влез в дневника"}
        </button>
      </form>
    </main>
  );
}
export function AdminList({
  data,
  signOut,
}: {
  data: JournalData;
  signOut: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <main id="main" tabIndex={-1} className="workspace-page">
      <div className="workspace-actions">
        <a className="button" href={routeHref("/admin/new")}>
          Нов запис <span aria-hidden="true">+</span>
        </a>
        <a className="button secondary" href={routeHref("/settings")}>
          Настройки
        </a>
        {analyticsCode && (
          <a
            className="button secondary"
            href={`https://${analyticsCode}.goatcounter.com/`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Статистика ↗
          </a>
        )}
        <button
          className="text-button"
          onClick={() =>
            void signOut().catch(() =>
              setError("Изходът не успя. Опитай отново."),
            )
          }
        >
          Изход
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      <h2>
        Твоите дни <span className="subtle">({data.entries.length})</span>
      </h2>
      {data.entries.length ? (
        <ul className="entry-list">
          {[...data.entries].reverse().map((e) => (
            <li key={e.id}>
              <a href={routeHref(`/admin/${e.id}`)}>
                <time dateTime={e.date}>
                  {formatDate(e.date)}
                  <small>{e.date.slice(0, 4)}</small>
                </time>
                <strong>{e.title}</strong>
                <span className={`entry-status ${e.status}`}>
                  {e.status === "draft" ? "Чернова" : "Публикуван"}
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">
          Първата страница още е празна. Започни с днешния ден.
        </p>
      )}
      <p className="small-print">
        Само публикуваните записи се виждат в дневника. Черновите са твои.
      </p>
    </main>
  );
}
export function EntryEditor({
  initial,
  data,
  urls,
  save,
  remove,
  markDirty,
}: {
  initial?: Entry;
  data: JournalData;
  urls: Record<string, string>;
  save: (entry: Entry) => Promise<void>;
  remove: (id: string) => Promise<void>;
  markDirty: (dirty: boolean) => void;
}) {
  const [entry, setEntry] = useState<Entry>(() =>
    structuredClone(initial ?? newEntry()),
  );
  const [before, setBefore] = useState<PhotoChange>();
  const [after, setAfter] = useState<PhotoChange>();
  const [extraPhotos, setExtraPhotos] = useState<ExtraPhotoDraft[]>(() =>
    (initial?.extra_photos ?? []).map((path) => ({
      id: crypto.randomUUID(),
      path,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => () => markDirty(false), [markDirty]);
  const changed = () => {
    setDirty(true);
    markDirty(true);
    setMessage("");
  };
  const patch = (values: Partial<Entry>) => {
    setEntry((e) => ({ ...e, ...values }));
    changed();
  };
  const onPhotoBusy = (value: boolean) =>
    setPhotoBusy((n) => Math.max(0, n + (value ? 1 : -1)));
  async function store(status: Entry["status"]) {
    if (busy || photoBusy > 0) return;
    const candidate = { ...entry, status };
    const validation = validateEntry(
      candidate,
      data.entries,
      data.settings.start_date,
    );
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const uploaded: string[] = [];
    try {
      async function resolve(
        change: PhotoChange | undefined,
        old: string | null,
      ) {
        if (change === undefined) return old;
        if (change === null) return null;
        const path = await uploadPhoto(change.blob);
        uploaded.push(path);
        return path;
      }
      const final = {
        ...candidate,
        before_photo: await resolve(before, entry.before_photo),
        after_photo: await resolve(after, entry.after_photo),
        extra_photos: [] as string[],
      };
      for (const photo of extraPhotos) {
        const path =
          photo.blob && photo.preview
            ? await resolve({ blob: photo.blob, preview: photo.preview }, null)
            : photo.path;
        if (path) final.extra_photos.push(path);
      }
      await save(final);
      setEntry(final);
      setBefore(undefined);
      setAfter(undefined);
      setExtraPhotos(
        final.extra_photos.map((path, index) => ({
          id: extraPhotos[index].id,
          path,
        })),
      );
      setDirty(false);
      markDirty(false);
      setMessage(
        status === "published"
          ? "Денят е публикуван."
          : "Черновата е запазена.",
      );
      if (!initial) navigate(`/admin/${final.id}`);
    } catch {
      await discardUploads(uploaded);
      setError(
        "Записът не се запази. Текстът ти е тук — провери връзката и свободното място, после опитай отново.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deleteEntry() {
    if (
      !initial ||
      !window.confirm(
        "Да изтрия този запис? Това действие не може да се върне.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await remove(entry.id);
      markDirty(false);
      navigate("/admin");
    } catch {
      setError("Записът не се изтри. Опитай отново.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" tabIndex={-1} className="editor-page">
      <div className="editor-topline">
        <a href={routeHref("/admin")}>← Всички записи</a>
        <span>
          {dirty
            ? "Незапазени промени"
            : entry.status === "draft"
              ? "Чернова"
              : "Публикуван запис"}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void store(entry.status);
        }}
      >
        <fieldset disabled={busy}>
          <div className="editor-meta">
            <label>
              Дата
              <input
                type="date"
                required
                min={data.settings.start_date}
                value={entry.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={entry.training}
                onChange={(e) => patch({ training: e.target.checked })}
              />
              Тренирах днес
            </label>
          </div>
          <label className="title-field">
            Заглавие на деня
            <input
              maxLength={180}
              required
              placeholder="Как би запомнил този ден?"
              value={entry.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <div className="editor-columns">
            <div>
              <div className="editor-photos">
                <PhotoField
                  label="Преди тренировка"
                  src={
                    before === undefined
                      ? urls[entry.before_photo ?? ""]
                      : before?.preview
                  }
                  onChange={(p) => {
                    setBefore(p);
                    changed();
                  }}
                  onBusy={onPhotoBusy}
                />
                <PhotoField
                  label="След тренировка"
                  src={
                    after === undefined
                      ? urls[entry.after_photo ?? ""]
                      : after?.preview
                  }
                  onChange={(p) => {
                    setAfter(p);
                    changed();
                  }}
                  onBusy={onPhotoBusy}
                />
              </div>
              <p className="small-print">
                JPG, PNG или WebP · до 20 MB. Снимките се намаляват автоматично
                преди качване.
              </p>
              <ExtraPhotoEditor
                photos={extraPhotos}
                urls={urls}
                onChange={(photos) => {
                  setExtraPhotos(photos);
                  changed();
                }}
                onBusy={(value) => {
                  onPhotoBusy(value);
                  if (value) changed();
                }}
              />
              <label>
                {entry.training ? "Какво тренирах" : "Как си починах"}
                <textarea
                  rows={3}
                  value={entry.training_note}
                  onChange={(e) => patch({ training_note: e.target.value })}
                  placeholder="Упражнения, време, усещане…"
                />
              </label>
              <label>
                Какво ядох
                <textarea
                  rows={4}
                  value={entry.food}
                  onChange={(e) => patch({ food: e.target.value })}
                  placeholder="Количество с твои думи: две яйца, купа ориз…"
                />
              </label>
            </div>
            <div className="writing-sections">
              <h2>Мислите от деня</h2>
              <p className="field-help">
                Пиши свободно. Можеш да променяш заглавията и да добавяш още
                части.
              </p>
              {entry.sections.map((section, index) => (
                <section className="writing-section" key={section.id}>
                  <label>
                    Заглавие на част {index + 1}
                    <input
                      maxLength={120}
                      value={section.heading}
                      onChange={(e) =>
                        patch({
                          sections: entry.sections.map((s) =>
                            s.id === section.id
                              ? { ...s, heading: e.target.value }
                              : s,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Текст на част {index + 1}
                    <textarea
                      rows={7}
                      value={section.body}
                      onChange={(e) =>
                        patch({
                          sections: entry.sections.map((s) =>
                            s.id === section.id
                              ? { ...s, body: e.target.value }
                              : s,
                          ),
                        })
                      }
                      placeholder="Какво ми беше в главата…"
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (
                        !section.body.trim() ||
                        window.confirm("Да премахна тази част и текста в нея?")
                      )
                        patch({
                          sections: entry.sections.filter(
                            (s) => s.id !== section.id,
                          ),
                        });
                    }}
                  >
                    Премахни тази част
                  </button>
                </section>
              ))}
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  patch({
                    sections: [
                      ...entry.sections,
                      { id: crypto.randomUUID(), heading: "", body: "" },
                    ],
                  })
                }
              >
                Добави още мисли +
              </button>
            </div>
          </div>
        </fieldset>
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <div className="save-bar">
          <div>
            <button
              type="button"
              className="button secondary"
              disabled={busy || photoBusy > 0}
              onClick={() => void store("draft")}
            >
              {busy
                ? "Запазване…"
                : entry.status === "published"
                  ? "Върни в чернова"
                  : "Запази чернова"}
            </button>
            <button
              className="button"
              type="button"
              disabled={busy || photoBusy > 0}
              onClick={() => void store("published")}
            >
              {busy
                ? "Запазване…"
                : entry.status === "published"
                  ? "Запази и публикувай"
                  : "Публикувай деня"}
            </button>
          </div>
          {initial?.status === "published" && (
            <a href={routeHref(`/journal/${initial.date}`)}>Виж в дневника ↗</a>
          )}
        </div>
        {initial && (
          <button
            type="button"
            disabled={busy}
            className="text-button danger"
            onClick={() => void deleteEntry()}
          >
            Изтрий записа
          </button>
        )}
      </form>
    </main>
  );
}
export function SettingsEditor({
  data,
  urls,
  save,
  markDirty,
}: {
  data: JournalData;
  urls: Record<string, string>;
  save: (s: Settings) => Promise<void>;
  markDirty: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState(data.settings);
  const [photo, setPhoto] = useState<PhotoChange>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => () => markDirty(false), [markDirty]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || photoBusy) return;
    setError("");
    setMessage("");
    if (!validDate(settings.start_date)) {
      setError("Избери валидна начална дата.");
      return;
    }
    if (data.entries.some((entry) => entry.date < settings.start_date)) {
      setError("Началото трябва да е на или преди първия запис.");
      return;
    }
    setBusy(true);
    const uploaded: string[] = [];
    try {
      let path = settings.baseline_photo;
      if (photo === null) path = null;
      else if (photo) {
        path = await uploadPhoto(photo.blob);
        uploaded.push(path);
      }
      const next = { ...settings, baseline_photo: path };
      await save(next);
      setSettings(next);
      setPhoto(undefined);
      markDirty(false);
      setMessage("Началото на дневника е запазено.");
    } catch {
      await discardUploads(uploaded);
      setError(
        "Настройките не се запазиха. Провери връзката си и опитай отново.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" tabIndex={-1} className="editor-page settings-page">
      <a href={routeHref("/admin")}>← Към редактора</a>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <div>
            <PhotoField
              label="Начална снимка"
              src={
                photo === undefined
                  ? urls[settings.baseline_photo ?? ""]
                  : photo?.preview
              }
              onChange={(p) => {
                setPhoto(p);
                markDirty(true);
                setMessage("");
              }}
              onBusy={setPhotoBusy}
            />
            <p className="small-print">
              Това е публичната снимка, от която започва сравнението.
            </p>
          </div>
          <div>
            <label>
              Начална дата
              <input
                type="date"
                value={settings.start_date}
                required
                onChange={(e) => {
                  setSettings((s) => ({ ...s, start_date: e.target.value }));
                  markDirty(true);
                }}
              />
            </label>
            <label>
              За този дневник
              <textarea
                rows={8}
                value={settings.intro}
                onChange={(e) => {
                  setSettings((s) => ({ ...s, intro: e.target.value }));
                  markDirty(true);
                }}
                placeholder="Защо започвам и какво искам да запазя…"
              />
            </label>
            {analyticsCode && (
              <p>
                <a
                  href={`https://${analyticsCode}.goatcounter.com/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Отвори личната статистика ↗
                </a>
              </p>
            )}
          </div>
        </fieldset>
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <button className="button" disabled={busy || photoBusy}>
          {busy ? "Запазване…" : "Запази началото"}
        </button>
      </form>
    </main>
  );
}
