import type { Entry } from "./model";
import { formatDate, isArticle } from "./model";
import { routeHref } from "./navigation";

export default function Archive({ entries, filter }: { entries: Entry[]; filter?: string }) {
  const selected = filter === "article" || filter === "journal" ? filter : "all";
  const visible = [...entries].reverse().filter((entry) => selected === "all" || (isArticle(entry) ? "article" : "journal") === selected);
  return (
    <main id="main" tabIndex={-1} className="archive-page">
      <p className="archive-intro">Тренировките и статиите на едно място. Започни от последното или се върни към по-ранен запис.</p>
      <nav className="archive-filters" aria-label="Филтриране на записите">
        {[["all", "Всички"], ["journal", "Дневник"], ["article", "Статии"]].map(([kind, label]) => (
          <a key={kind} href={routeHref(`/archive${kind === "all" ? "" : `?type=${kind}`}`)} aria-current={selected === kind ? "page" : undefined}>
            {label}<span>{kind === "all" ? entries.length : entries.filter((entry) => (isArticle(entry) ? "article" : "journal") === kind).length}</span>
          </a>
        ))}
      </nav>
      {visible.length ? <ol className="archive-list">
        {visible.map((entry) => <li key={entry.id}>
          <a href={routeHref(`/journal/${entry.date}`)}>
            <div className="archive-date"><time dateTime={entry.date}>{formatDate(entry.date)} {entry.date.slice(0, 4)}</time><span>{isArticle(entry) ? "Статия" : "Дневник"}</span></div>
            <h2>{entry.title}</h2>
            <span className="archive-open" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16m-6-6 6 6-6 6" /></svg></span>
          </a>
        </li>)}
      </ol> : <div className="archive-empty"><h2>{selected === "article" ? "Статиите предстоят." : selected === "journal" ? "Първият ден предстои." : "Първият запис предстои."}</h2><p>Тук ще се появят публикуваните записи.</p>{entries.length > 0 && <a href={routeHref("/archive")}>Виж всички записи</a>}</div>}
    </main>
  );
}
