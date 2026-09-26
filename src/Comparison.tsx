import { useState } from "react";
import type { Entry, JournalData } from "./model";
import { dayNumber, formatDate } from "./model";
import { Photo } from "./components";
import { routeHref } from "./navigation";

export default function Comparison({
  data,
  entries,
  urls,
  date,
}: {
  data: JournalData;
  entries: Entry[];
  urls: Record<string, string>;
  date?: string;
}) {
  const choices = entries.filter((e) => e.before_photo || e.after_photo);
  const [selected, setSelected] = useState(date ?? choices.at(-1)?.date ?? "");
  const [moment, setMoment] = useState<"before_photo" | "after_photo">(
    "before_photo",
  );
  const [mode, setMode] = useState<"pair" | "overlay">("pair");
  const [split, setSplit] = useState(50);
  const entry = choices.find((e) => e.date === selected) ?? choices.at(-1);
  const path = entry?.[moment];
  const startSrc = urls[data.settings.baseline_photo ?? ""];
  const currentSrc = urls[path ?? ""];
  return (
    <main id="main" tabIndex={-1} className="comparison-page">
      <div className="comparison-intro">
        <div>
          <h2>Началото и днес.</h2>
          <p>Една история, видяна от два момента.</p>
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
              value={moment}
              onChange={(e) => setMoment(e.target.value as typeof moment)}
            >
              <option value="before_photo">Преди тренировка</option>
              <option value="after_photo">След тренировка</option>
            </select>
          </label>
        </div>
      </div>
      <div
        className="view-switch"
        role="group"
        aria-label="Изглед за сравнение"
      >
        <button
          className={mode === "pair" ? "selected" : ""}
          aria-pressed={mode === "pair"}
          onClick={() => setMode("pair")}
        >
          Една до друга
        </button>
        <button
          disabled={!startSrc || !currentSrc}
          className={mode === "overlay" ? "selected" : ""}
          aria-pressed={mode === "overlay"}
          onClick={() => setMode("overlay")}
        >
          Наслагване
        </button>
      </div>
      {mode === "overlay" && startSrc && currentSrc ? (
        <div className="overlay-wrap">
          <div className="photo-overlay">
            <img
              src={currentSrc}
              alt={`Избраният ден: ${entry ? formatDate(entry.date) : ""}`}
            />
            <img
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
            <span className="overlay-label right">Избраният ден</span>
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
                ? `Ден ${dayNumber(entry.date, data.settings.start_date)} · ${formatDate(entry.date)}`
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
        За по-смислено сравнение снимай от сходно разстояние и при еднаква
        светлина. Ако за избрания момент няма снимка, избери друг момент или
        ден.
      </p>
    </main>
  );
}
