import { useCallback, useEffect, useRef, useState } from "react";
import { Header, Journal, Notice, Photo } from "./components";
import { AdminList, EntryEditor, Login, SettingsEditor } from "./Editor";
import Comparison from "./Comparison";
import { supabase } from "./cloud";
import { analyticsCode, useAnalytics } from "./analytics";
import { publishedEntries, formatDate } from "./model";
import { useJournal, usePhotoUrls } from "./useJournal";

export default function App() {
  const journal = useJournal();
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  const dirty = useRef(false);
  const markDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);
  const urls = usePhotoUrls(journal.data);
  const path = route.split("?")[0];
  const query = new URLSearchParams(route.split("?")[1] ?? "");
  const entries = publishedEntries(journal.data?.entries ?? []);
  const requestedDate = path.startsWith("/journal/")
    ? path.slice("/journal/".length)
    : "";
  const entry = requestedDate
    ? entries.find((e) => e.date === requestedDate)
    : entries.at(-1);
  const publicRoute = path === "/" || path.startsWith("/journal/");
  useAnalytics(
    route,
    journal.authReady &&
      !journal.userId &&
      !journal.owner &&
      !journal.loading &&
      !journal.error &&
      (publicRoute || path === "/compare" || path === "/about"),
  );

  useEffect(() => {
    let previous = location.hash.slice(1) || "/";
    const change = () => {
      const next = location.hash.slice(1) || "/";
      if (
        dirty.current &&
        !window.confirm("Има незапазени промени. Да напусна без запазване?")
      ) {
        history.replaceState(null, "", `#${previous}`);
        return;
      }
      dirty.current = false;
      previous = next;
      setRoute(next);
      window.scrollTo({ top: 0, behavior: "instant" });
      requestAnimationFrame(() =>
        document.getElementById("main")?.focus({ preventScroll: true }),
      );
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("hashchange", change);
    addEventListener("beforeunload", unload);
    return () => {
      removeEventListener("hashchange", change);
      removeEventListener("beforeunload", unload);
    };
  }, []);
  useEffect(() => {
    document.title = `${publicRoute && entry ? entry.title : path === "/compare" ? "Сравнение" : path === "/about" ? "За проекта" : path.startsWith("/admin") ? "Личен редактор" : "Дневник"} · Личен ритъм`;
  }, [path, entry, publicRoute]);
  const pageTitle =
    path === "/compare"
      ? "Виж откъде започна."
      : path === "/about"
        ? "Една лична история."
        : path === "/settings"
          ? "Оттук започва всичко."
          : path.startsWith("/admin")
            ? path === "/admin"
              ? "Думите зад снимките."
              : "Още един ден. Твоите думи."
            : undefined;
  let content;
  if (!supabase)
    content = (
      <main id="main" tabIndex={-1} className="narrow-page journal-status">
        <h2>Дневникът се подготвя.</h2>
        <p>
          Тук ще бъдат моите тренировки, снимки и мисли.
          Първите записи предстоят.
        </p>
      </main>
    );
  else if (journal.loading)
    content = (
      <main id="main" tabIndex={-1} className="narrow-page">
        <Notice>Отварям дневника…</Notice>
      </main>
    );
  else if (journal.error || !journal.data)
    content = (
      <main id="main" tabIndex={-1} className="narrow-page journal-status">
        <h2>Дневникът временно не е достъпен.</h2>
        <p role="alert">{journal.error || "Опитай отново след малко."}</p>
        <button
          className="button"
          onClick={() => {
            if (journal.userId === undefined) location.reload();
            else void journal.reload();
          }}
        >
          Опитай отново
        </button>
      </main>
    );
  else if (path.startsWith("/admin") || path === "/settings") {
    if (!journal.owner)
      content = journal.userId ? (
        <main id="main" tabIndex={-1} className="narrow-page">
          <h2>Този акаунт няма достъп.</h2>
          <p>Редакторът е само за автора на дневника.</p>
          <button className="button" onClick={() => void journal.signOut()}>
            Излез от акаунта
          </button>
        </main>
      ) : (
        <Login />
      );
    else if (path === "/settings")
      content = (
        <SettingsEditor
          data={journal.data}
          urls={urls}
          save={journal.saveSettings}
          markDirty={markDirty}
        />
      );
    else if (path === "/admin")
      content = <AdminList data={journal.data} signOut={journal.signOut} />;
    else {
      const id = path.slice("/admin/".length);
      const found = journal.data.entries.find((e) => e.id === id);
      content =
        id === "new" || found ? (
          <EntryEditor
            key={id}
            initial={found}
            data={journal.data}
            urls={urls}
            save={journal.save}
            remove={journal.remove}
            markDirty={markDirty}
          />
        ) : (
          <main id="main" tabIndex={-1} className="narrow-page">
            <h2>Записът не е намерен.</h2>
            <a href="#/admin">Към твоите дни →</a>
          </main>
        );
    }
  } else if (publicRoute) {
    content = entry ? (
      <Journal
        data={journal.data}
        entry={entry}
        entries={entries}
        urls={urls}
      />
    ) : (
      <main id="main" tabIndex={-1} className="narrow-page">
        <h2>
          {requestedDate
            ? "Този ден още не е тук."
            : "Първата страница предстои."}
        </h2>
        <p>
          {requestedDate
            ? "Записът липсва или още не е публикуван."
            : "Когато първият запис е готов, ще го намериш тук."}
        </p>
        <a
          className="button secondary"
          href={entries.length ? "#/" : "#/about"}
        >
          {entries.length ? "Към последния ден" : "За този дневник"}
        </a>
      </main>
    );
  } else if (path === "/compare")
    content = (
      <Comparison
        key={route}
        data={journal.data}
        entries={entries}
        urls={urls}
        date={query.get("date") ?? undefined}
      />
    );
  else if (path === "/about")
    content = (
      <main id="main" tabIndex={-1} className="about-page">
        <div>
          <h2>За да си спомня.</h2>
          <p className="about-intro">{journal.data.settings.intro}</p>
          <p>
            Тук има място и за тренировките, и за почивката. За храната с
            обикновени думи. И за всичко, което ми минава през главата, докато
            се връщам в ритъм.
          </p>
          <a className="button" href="#/">
            Разгледай дневника →
          </a>
          {analyticsCode && (
            <p className="small-print">
              Посещенията на публичните страници се отчитат с GoatCounter.
              Статистиката е за автора на сайта.
            </p>
          )}
        </div>
        <Photo
          src={urls[journal.data.settings.baseline_photo ?? ""]}
          alt="Началната снимка"
          caption={`Началото · ${formatDate(journal.data.settings.start_date)} ${journal.data.settings.start_date.slice(0, 4)}`}
          priority
        />
      </main>
    );
  else
    content = (
      <main id="main" tabIndex={-1} className="narrow-page">
        <h2>Тази страница не съществува.</h2>
        <a href="#/">Към дневника →</a>
      </main>
    );
  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
          document.getElementById("main")?.scrollIntoView();
        }}
      >
        Към съдържанието
      </a>
      <Header
        route={path}
        entry={
          publicRoute && !journal.loading && !journal.error ? entry : undefined
        }
        start={journal.data?.settings.start_date}
        title={journal.data && !journal.error ? pageTitle : undefined}
        available={Boolean(journal.data) && !journal.error}
      />
      {content}
      <footer className="footer">
        <a className="footer-brand" href="#/">
          Личен ритъм
        </a>
        <span>Ден след ден.</span>
        <div>
          {supabase && (
            <a href="#/admin">
              {journal.owner ? "Личен редактор" : "Личен вход"}
            </a>
          )}
        </div>
      </footer>
    </>
  );
}
