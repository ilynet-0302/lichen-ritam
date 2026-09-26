import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { dayNumber, formatDate } from "./model";
import type { Entry, JournalData } from "./model";
import { DayGallery } from "./Gallery";
import { routeHref } from "./navigation";

export function Icon({ food = false }: { food?: boolean }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {food ? (
        <path d="M11 5v15c0 7 10 7 10 0V5M16 5v38M35 5c-7 4-8 13-8 20h8m0-20v38" />
      ) : (
        <path d="M16 24h16M5 18v12m6-18v24m26-24v24m6-18v12M5 24h6m26 0h6" />
      )}
    </svg>
  );
}
export function Photo({
  src,
  alt,
  caption,
  priority = false,
}: {
  src?: string;
  alt: string;
  caption?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <figure className="photo">
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      ) : (
        <div className="photo-empty">
          <span>{failed ? "Снимката не се зареди" : "Без снимка"}</span>
          {failed && (
            <button onClick={() => setFailed(false)}>Опитай отново</button>
          )}
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function Header({
  route,
  entry,
  start,
  title,
  available = true,
}: {
  route: string;
  entry?: Entry;
  start?: string;
  title?: string;
  available?: boolean;
}) {
  return (
    <header className={`masthead${available ? "" : " masthead-unavailable"}`}>
      <div className="topbar">
        <a className="wordmark" href={routeHref("/")}>
          Личен ритъм
        </a>
        <p className="motto">
          ДИСЦИПЛИНАТА СЪЗДАВА
          <br />
          СВОБОДА.
        </p>
        {available && (
          <nav aria-label="Основна навигация">
            {[
              ["/", "Дневник"],
              ["/compare", "Сравнение"],
              ["/about", "За проекта"],
            ].map(([path, label]) => {
              const active =
                path === "/"
                  ? route === "/" || route.startsWith("/journal")
                  : route === path;
              return (
                <a
                  className={active ? "active" : ""}
                  aria-current={active ? "page" : undefined}
                  key={path}
                  href={routeHref(`${path}`)}
                >
                  {label}
                </a>
              );
            })}
          </nav>
        )}
        <p className="tagline">
          СЪЩИЯТ ЧОВЕК.
          <br />
          ПО-СИЛЕН УТРЕ.
        </p>
      </div>
      {entry && start ? (
        <div className="day-header">
          <div className="day-identity">
            <span
              className={`day-number ${dayNumber(entry.date, start) > 99 ? "long-number" : ""}`}
              aria-label={`Ден ${dayNumber(entry.date, start)}`}
            >
              {String(dayNumber(entry.date, start)).padStart(2, "0")}
            </span>
            <div className="date-block">
              <span className="day-label" aria-hidden="true">
                Ден
              </span>
              <time dateTime={entry.date}>{formatDate(entry.date)}</time>
              <span className="weekday">{formatDate(entry.date, true)}</span>
            </div>
          </div>
          <h1 className={entry.title.length > 60 ? "long-title" : ""}>
            {entry.title}
          </h1>
        </div>
      ) : (
        <div className="page-heading">
          <h1>{title || "Всеки ден е част от историята."}</h1>
        </div>
      )}
    </header>
  );
}
export function Journal({
  data,
  entry,
  entries,
  urls,
}: {
  data: JournalData;
  entry: Entry;
  entries: Entry[];
  urls: Record<string, string>;
}) {
  const index = entries.findIndex((e) => e.id === entry.id);
  const stripStart = Math.max(0, Math.min(index - 6, entries.length - 8));
  const visible = entries.slice(stripStart, stripStart + 8);
  return (
    <main id="main" tabIndex={-1} className="spread" key={entry.id}>
      <aside className="day-evidence">
        <div className="photographs">
          <Photo
            src={urls[entry.before_photo ?? ""]}
            alt={`Преди тренировка на ${formatDate(entry.date)}`}
            caption="Преди тренировка"
            priority
          />
          <Photo
            src={urls[entry.after_photo ?? ""]}
            alt={`След тренировка на ${formatDate(entry.date)}`}
            caption="След тренировка"
            priority
          />
        </div>
        <DayGallery
          paths={entry.extra_photos ?? []}
          urls={urls}
          date={entry.date}
        />
        <div className="photo-navigation">
          <nav className="day-strip" aria-label="Дни в дневника">
            {visible.map((e) => (
              <a
                key={e.id}
                href={routeHref(`/journal/${e.date}`)}
                title={`${formatDate(e.date)} — ${e.title}`}
                aria-label={`Ден ${dayNumber(e.date, data.settings.start_date)}, ${formatDate(e.date)}`}
                className={e.id === entry.id ? "selected" : ""}
                aria-current={e.id === entry.id ? "date" : undefined}
              >
                {String(dayNumber(e.date, data.settings.start_date)).padStart(
                  2,
                  "0",
                )}
              </a>
            ))}
          </nav>
          <a className="compare-link" href={routeHref(`/compare?date=${entry.date}`)}>
            Сравни с началото <span aria-hidden="true">→</span>
          </a>
        </div>
        <dl className="day-details">
          <div>
            <Icon />
            <div>
              <dt>{entry.training ? "Тренировка" : "Ден за почивка"}</dt>
              <dd>
                {entry.training_note ||
                  (entry.training
                    ? "Без допълнителни бележки."
                    : "Време за възстановяване.")}
              </dd>
            </div>
          </div>
          <div>
            <Icon food />
            <div>
              <dt>Храна</dt>
              <dd>{entry.food || "Днес няма бележка за храната."}</dd>
            </div>
          </div>
        </dl>
      </aside>
      <article className="day-story" aria-label="Мисли за деня">
        {entry.sections
          .filter((s) => s.body.trim())
          .map((s) => (
            <section key={s.id}>
              {s.heading && <h2>{s.heading}</h2>}
              <p>{s.body}</p>
            </section>
          ))}
      </article>
      <nav className="entry-pagination" aria-label="Предишен и следващ запис">
        {index > 0 ? (
          <a href={routeHref(`/journal/${entries[index - 1].date}`)}>
            ← {formatDate(entries[index - 1].date)}
          </a>
        ) : (
          <span>Началото на дневника</span>
        )}
        <details>
          <summary>
            Всички дни <span>({entries.length})</span>
          </summary>
          <ol>
            {entries.map((e) => (
              <li key={e.id}>
                <a href={routeHref(`/journal/${e.date}`)}>
                  <time>
                    {formatDate(e.date)} {e.date.slice(0, 4)}
                  </time>
                  <span>{e.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>
        {index < entries.length - 1 ? (
          <a href={routeHref(`/journal/${entries[index + 1].date}`)}>
            {formatDate(entries[index + 1].date)} →
          </a>
        ) : (
          <span>Последният запис</span>
        )}
      </nav>
    </main>
  );
}
