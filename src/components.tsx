import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { articlePhotos, dayNumber, formatDate, isArticle } from "./model";
import type { Entry, JournalData } from "./model";
import { DayGallery } from "./Gallery";
import { routeHref } from "./navigation";
import { ReadingText, readingMinutes } from "./ReadingText";

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
}: {
  route: string;
  entry?: Entry;
  start?: string;
  title?: string;
}) {
  return (
    <>
    <header className="site-header">
      <div className="topbar">
        <a className="wordmark" href={routeHref("/")}>
          Личен ритъм
        </a>
        <p className="motto">
          ДИСЦИПЛИНАТА СЪЗДАВА
          <br />
          СВОБОДА.
        </p>
        <nav aria-label="Основна навигация">
            {[
              ["/archive", "Всички записи"],
              ["/compare", "Сравнение"],
              ["/about", "За проекта"],
            ].map(([path, label]) => {
              const active =
                path === "/archive"
                  ? route === "/archive" || route === "/" || route.startsWith("/journal")
                  : route === path;
              return (
                <a
                  className={active ? "active" : ""}
                  aria-current={active ? (route === path ? "page" : "true") : undefined}
                  key={path}
                  href={routeHref(`${path}`)}
                >
                  {label}
                </a>
              );
            })}
        </nav>
        <p className="tagline">
          СЪЩИЯТ ЧОВЕК.
          <br />
          ПО-СИЛЕН УТРЕ.
        </p>
      </div>
    </header>
    <div className="masthead">
      {entry && <nav className={`page-location${isArticle(entry) ? " article-location" : ""}`} aria-label="Местоположение">
        <a href={routeHref("/archive")}>Всички записи</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{isArticle(entry) ? "Статия" : "Дневник"}</span>
      </nav>}
      {entry && start && isArticle(entry) ? (
        <div className="article-header">
          <h1 id="entry-title" tabIndex={-1}>{entry.title}</h1>
          <p className="article-meta">
            <span>Статия</span>
            <time dateTime={entry.date}>{formatDate(entry.date)} {entry.date.slice(0, 4)}</time>
            <span>Около {readingMinutes(entry.sections)} мин четене</span>
          </p>
        </div>
      ) : entry && start ? (
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
          <h1 id="entry-title" tabIndex={-1} className={entry.title.length > 60 ? "long-title" : ""}>
            {entry.title}
          </h1>
        </div>
      ) : (
        <div className="page-heading">
          <h1>{title || "Всеки ден е част от историята."}</h1>
        </div>
      )}
    </div>
    </>
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
  if (isArticle(entry)) {
    const photos = articlePhotos(entry);
    const sections = entry.sections.filter((section) => section.body.trim());
    const headings = sections.filter((section) => section.heading.trim());
    return (
      <main id="main" tabIndex={-1} className="article-page" key={entry.id}>
        <EntryPagination entries={entries} index={index} position="top" />
        <article className="day-story article-story" aria-label={entry.title}>
          {photos.length > 0 && <div className="article-cover">
            <Photo src={urls[photos[0]]} alt={`Снимка към „${entry.title}“`} priority />
          </div>}
          {headings.length > 2 && <details className="article-contents">
            <summary>В тази статия <span>{headings.length} части</span></summary>
            <nav aria-label="Съдържание на статията"><ol>
              {headings.map((section) => <li key={section.id}><a href={`#section-${section.id}`}>{section.heading}</a></li>)}
            </ol></nav>
          </details>}
          {sections.map((s) => (
            <section key={s.id} id={`section-${s.id}`} tabIndex={-1}>
              {s.heading && <h2>{s.heading}</h2>}
              <ReadingText text={s.body} article />
            </section>
          ))}
          <DayGallery paths={photos.slice(1)} urls={urls} date={entry.date} title="Още снимки към статията" />
          <a className="back-to-article" href="#entry-title">Към началото на статията ↑</a>
        </article>
        <EntryPagination entries={entries} index={index} />
      </main>
    );
  }
  return (
    <main id="main" tabIndex={-1} className="spread" key={entry.id}>
      <EntryPagination entries={entries} index={index} position="top" />
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
          {(entry.before_photo || entry.after_photo) && <a className="compare-link" href={routeHref(`/compare?date=${entry.date}`)}>
            Сравни с началото <span aria-hidden="true">→</span>
          </a>}
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
              <ReadingText text={s.body} />
            </section>
          ))}
      </article>
      <EntryPagination entries={entries} index={index} />
    </main>
  );
}

function NavigationIcon({ direction }: { direction: "previous" | "next" | "archive" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "archive" ? (
        <path d="m6 9 6 6 6-6" />
      ) : direction === "previous" ? (
        <path d="M20 12H4m6-6-6 6 6 6" />
      ) : (
        <path d="M4 12h16m-6-6 6 6-6 6" />
      )}
    </svg>
  );
}

function EntryPagination({
  entries,
  index,
  position = "bottom",
}: {
  entries: Entry[];
  index: number;
  position?: "top" | "bottom";
}) {
  const [expanded, setExpanded] = useState(false);
  const archiveId = useId();
  const previous = entries[index - 1];
  const next = entries[index + 1];

  function adjacent(entry: Entry | undefined, direction: "previous" | "next") {
    const label = direction === "previous" ? "Предишен" : "Следващ";
    const content = (
      <>
        <NavigationIcon direction={direction} />
        <span className="entry-nav-copy">
          <span className="entry-nav-label">{label}</span>
          {entry ? (
            <><time dateTime={entry.date}>{formatDate(entry.date)}</time><span className="entry-nav-destination">{entry.title}</span></>
          ) : (
            <span className="entry-nav-boundary">
              {direction === "previous" ? "Началото на дневника" : "Последният запис"}
            </span>
          )}
        </span>
      </>
    );
    return entry ? (
      <a
        className={`entry-nav-control entry-nav-${direction}`}
        href={routeHref(`/journal/${entry.date}`)}
        rel={direction === "previous" ? "prev" : "next"}
        aria-label={`${label} запис: ${formatDate(entry.date)} ${entry.date.slice(0, 4)} — ${entry.title}`}
      >
        {content}
      </a>
    ) : (
      <span className={`entry-nav-control entry-nav-${direction} entry-nav-unavailable`}>
        {content}
      </span>
    );
  }

  return (
    <nav className={`entry-pagination entry-pagination-${position}`} aria-label={`Навигация между записи — ${position === "top" ? "начало" : "край"}`}>
      {adjacent(previous, "previous")}
      <button
        type="button"
        className="entry-nav-control entry-nav-archive"
        aria-expanded={expanded}
        aria-controls={archiveId}
        onClick={() => setExpanded(!expanded)}
      >
        <span>Всички записи</span>
        <span className="entry-nav-count">{entries.length}</span>
        <NavigationIcon direction="archive" />
      </button>
      {adjacent(next, "next")}
      <ol id={archiveId} className="entry-nav-list" hidden={!expanded}>
        {entries.map((e, entryIndex) => (
          <li key={e.id}>
            <a href={routeHref(`/journal/${e.date}`)} aria-current={entryIndex === index ? "page" : undefined}>
              <time dateTime={e.date}>{formatDate(e.date)} {e.date.slice(0, 4)}</time>
              <span className="entry-nav-title">{e.title}<small className="entry-type-label">{isArticle(e) ? "Статия" : "Дневник"}{entryIndex === index && " · Четеш сега"}</small></span>
              <NavigationIcon direction="next" />
            </a>
          </li>
        ))}
        <li><a className="archive-page-link" href={routeHref("/archive")}>Отвори архива с филтри <NavigationIcon direction="next" /></a></li>
      </ol>
    </nav>
  );
}
