import { useEffect, useState } from "react";
import type { PointerEvent } from "react";
import type { Entry, JournalData } from "./model";
import { dayNumber, formatDate, isArticle } from "./model";
import { Photo } from "./components";
import { routeHref } from "./navigation";

export default function Comparison({
  data,
  entries,
  urls,
  date,
  initialMoment,
  initialView,
}: {
  data: JournalData;
  entries: Entry[];
  urls: Record<string, string>;
  date?: string;
  initialMoment?: string;
  initialView?: string;
}) {
  const choices = entries.filter((e) => !isArticle(e) && (e.before_photo || e.after_photo));
  const [selected, setSelected] = useState(date ?? choices.at(-1)?.date ?? "");
  const [moment, setMoment] = useState<"before_photo" | "after_photo">(
    initialMoment === "after_photo" ? "after_photo" : "before_photo",
  );
  const [mode, setMode] = useState<"pair" | "overlay">(initialView === "overlay" ? "overlay" : "pair");
  const [split, setSplit] = useState(50);
  const entry = choices.find((e) => e.date === selected) ?? choices.at(-1);
  const availableMoment = entry?.[moment] ? moment : entry?.before_photo ? "before_photo" : "after_photo";
  const path = entry?.[availableMoment];
  const startSrc = urls[data.settings.baseline_photo ?? ""];
  const currentSrc = urls[path ?? ""];
  const overlayAvailable = Boolean(startSrc && currentSrc);
  const activeMode = overlayAvailable ? mode : "pair";
  const momentLabel = availableMoment === "before_photo" ? "Преди тренировка" : "След тренировка";
  useEffect(() => {
    if (!entry) return;
    const query = new URLSearchParams({ date: entry.date, moment: availableMoment, view: mode });
    history.replaceState(history.state, "", routeHref(`/compare?${query}`));
  }, [entry, availableMoment, mode]);
  function moveSplit(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setSplit(Math.round(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))));
  }
  return (
    <main id="main" tabIndex={-1} className="comparison-page">
      <div className="comparison-intro">
        <div>
          <h2>Два момента, един до друг.</h2>
          <p>Избери ден и снимка, за да се върнеш към началото.</p>
        </div>
        <div className="comparison-controls">
          <label>
            Ден за сравнение
            <select
              value={entry?.date ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              disabled={!choices.length}
            >
              {!choices.length && <option value="">Все още няма снимки</option>}
              {choices.map((e) => (
                <option value={e.date} key={e.id}>
                  Ден {dayNumber(e.date, data.settings.start_date)} ·{" "}
                  {formatDate(e.date)} {e.date.slice(0, 4)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Снимка
            <select
              value={availableMoment}
              disabled={!entry}
              onChange={(e) => setMoment(e.target.value as typeof moment)}
            >
              {!entry && <option value="after_photo">Все още няма снимки</option>}
              {entry && <>
                <option value="before_photo" disabled={!entry.before_photo}>Преди тренировка{!entry.before_photo && " · няма снимка"}</option>
                <option value="after_photo" disabled={!entry.after_photo}>След тренировка{!entry.after_photo && " · няма снимка"}</option>
              </>}
            </select>
          </label>
        </div>
      </div>
      <p className="comparison-guidance" id="comparison-guidance">Снимките една до друга остават полезни и при различна поза. Наслагването работи най-добре при сходни поза, ъгъл и разстояние; то не подравнява кадрите автоматично.</p>
      {!data.settings.baseline_photo && <p className="comparison-empty-note">Началната снимка още не е добавена. Засега можеш да разглеждаш кадрите от отделните дни.</p>}
      {!choices.length && <p className="comparison-empty-note">Все още няма публикувани дни със снимки. <a href={routeHref("/archive")}>Разгледай записите</a></p>}
      <div
        className="view-switch"
        role="group"
        aria-label="Изглед за сравнение"
        aria-describedby="comparison-guidance"
      >
        <button
          className={activeMode === "pair" ? "selected" : ""}
          aria-pressed={activeMode === "pair"}
          onClick={() => setMode("pair")}
        >
          Една до друга
        </button>
        <button
          disabled={!overlayAvailable}
          className={activeMode === "overlay" ? "selected" : ""}
          aria-pressed={activeMode === "overlay"}
          onClick={() => setMode("overlay")}
        >
          Наслагване
        </button>
      </div>
      {activeMode === "overlay" && startSrc && currentSrc ? (
        <div className="overlay-wrap">
          <div className="photo-overlay"
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              moveSplit(event);
            }}
            onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveSplit(event); }}
            onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          >
            <img
              draggable={false}
              src={currentSrc}
              alt={`Избраният ден: ${entry ? formatDate(entry.date) : ""}`}
            />
            <img
              draggable={false}
              className="baseline-layer"
              src={startSrc}
              alt="Началната снимка"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div
              className="split-line"
              style={{ left: `${split}%` }}
              aria-hidden="true"
            >
              <span className="split-handle">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" />
                </svg>
              </span>
            </div>
            <span className="overlay-label left">Началото</span>
            <span className="overlay-label right">{entry && formatDate(entry.date)}</span>
          </div>
          <label className="range-label">
            Плъзни, за да сравниш
            <input
              type="range"
              min="0"
              max="100"
              value={split}
              aria-valuetext={`${split}% от началната снимка`}
              onChange={(e) => setSplit(Number(e.target.value))}
            />
          </label>
        </div>
      ) : (
        <div className="comparison-photos">
          <Photo
            src={startSrc}
            alt="Началната снимка на дневника"
            caption={`Началото · ${formatDate(data.settings.start_date)} ${data.settings.start_date.slice(0, 4)}`}
            priority
          />
          <Photo
            src={currentSrc}
            alt={
              entry ? `Снимка на ${formatDate(entry.date)}` : "Избраният ден"
            }
            caption={
              entry
                ? `Ден ${dayNumber(entry.date, data.settings.start_date)} · ${formatDate(entry.date)} ${entry.date.slice(0, 4)} · ${momentLabel}`
                : "Избраният ден"
            }
            priority
          />
        </div>
      )}
      {entry && (
        <a className="comparison-read" href={routeHref(`/journal/${entry.date}`)}>
          Прочети историята от този ден →
        </a>
      )}
      <p className="small-print">
        За следващите снимки: поставяй телефона на сходна височина и разстояние,
        при сходна светлина. Не е нужно всеки кадър да е идеален, за да остане част от историята.
      </p>
    </main>
  );
}
