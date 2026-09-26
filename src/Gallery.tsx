import { useRef, useState } from "react";
import { blobDataUrl, preparePhoto } from "./cloud";
import { formatDate } from "./model";
import { Notice, Photo } from "./components";

export type ExtraPhotoDraft = {
  id: string;
  path?: string;
  blob?: Blob;
  preview?: string;
};

export function ExtraPhotoEditor({
  photos,
  urls,
  onChange,
  onBusy,
}: {
  photos: ExtraPhotoDraft[];
  urls: Record<string, string>;
  onChange: (photos: ExtraPhotoDraft[]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function select(files: File[]) {
    if (!files.length || progress) return;
    onBusy(true);
    setError("");
    const added: ExtraPhotoDraft[] = [];
    const errors: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Обработване ${index + 1} от ${files.length}…`);
        try {
          const blob = await preparePhoto(file);
          added.push({
            id: crypto.randomUUID(),
            blob,
            preview: await blobDataUrl(blob),
          });
        } catch (e) {
          errors.push(
            `${file.name}: ${e instanceof Error ? e.message : "Снимката не се отвори."}`,
          );
        }
      }
      if (added.length) onChange([...photos, ...added]);
      if (errors.length) setError(errors.join(" "));
    } finally {
      setProgress("");
      onBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section
      className="extra-photo-editor"
      aria-labelledby="extra-photo-heading"
    >
      <h3 id="extra-photo-heading">Още от деня</h3>
      <p className="field-help">
        По желание: други ъгли, храната или момент от деня. Можеш да избереш
        няколко снимки наведнъж.
      </p>
      {photos.length > 0 && (
        <ol className="extra-photo-list">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <Photo
                src={photo.preview ?? urls[photo.path ?? ""]}
                alt={`Допълнителна снимка ${index + 1}`}
              />
              <button
                type="button"
                className="text-button"
                disabled={Boolean(progress)}
                aria-label={`Премахни допълнителна снимка ${index + 1}`}
                onClick={() =>
                  onChange(photos.filter((p) => p.id !== photo.id))
                }
              >
                Премахни
              </button>
            </li>
          ))}
        </ol>
      )}
      <label className="button secondary file-button extra-photo-upload">
        Добави още снимки
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          aria-label="Допълнителни снимки за деня"
          disabled={Boolean(progress)}
          onChange={(e) => void select(Array.from(e.target.files ?? []))}
        />
      </label>
      {progress && (
        <p className="field-help" role="status">
          {progress}
        </p>
      )}
      {error && <Notice error>{error}</Notice>}
    </section>
  );
}

export function DayGallery({
  paths,
  urls,
  date,
}: {
  paths: string[];
  urls: Record<string, string>;
  date: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  if (!paths.length) return null;
  const current = selected ?? 0;
  const move = (offset: number) =>
    setSelected((index) =>
      Math.max(0, Math.min(paths.length - 1, (index ?? 0) + offset)),
    );

  return (
    <section className="day-gallery" aria-label="Още снимки от деня">
      <div className="gallery-heading">
        <h2>Още от деня</h2>
        <span>
          {paths.length} {paths.length === 1 ? "снимка" : "снимки"}
        </span>
      </div>
      <div className="gallery-strip">
        {paths.map((path, index) => (
          <button
            type="button"
            key={`${path}-${index}`}
            aria-label={`Отвори снимка ${index + 1} от ${paths.length}`}
            onClick={() => {
              setSelected(index);
              dialog.current?.showModal();
            }}
          >
            {urls[path] ? (
              <img src={urls[path]} alt="" loading="lazy" />
            ) : (
              <span>Снимка {index + 1}</span>
            )}
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="gallery-viewer"
        aria-label={`Снимки от ${formatDate(date)}`}
        onClose={() => setSelected(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            move(e.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <div className="gallery-viewer-top">
          <p>Още от деня · {formatDate(date)}</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => dialog.current?.close()}
          >
            Затвори
          </button>
        </div>
        {selected !== null && (
          <div className="gallery-full">
            <Photo
              src={urls[paths[current]]}
              alt={`Допълнителна снимка ${current + 1} от ${formatDate(date)}`}
              priority
            />
          </div>
        )}
        <div className="gallery-viewer-bottom">
          <button
            type="button"
            className="button secondary"
            disabled={current === 0}
            onClick={() => move(-1)}
          >
            Предишна
          </button>
          <span role="status" aria-live="polite">
            {current + 1} / {paths.length}
          </span>
          <button
            type="button"
            className="button secondary"
            disabled={current === paths.length - 1}
            onClick={() => move(1)}
          >
            Следваща
          </button>
        </div>
      </dialog>
    </section>
  );
}
