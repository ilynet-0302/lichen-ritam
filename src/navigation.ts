const base = import.meta.env.BASE_URL;

// Each route has a real HTML entry on GitHub Pages. Dynamic records use a
// query string so newly published days work without rebuilding the website.
export function routeHref(route: string): string {
  const [path, search = ""] = route.split("?");
  const query = new URLSearchParams(search);
  let page = path.replace(/^\/+|\/+$/g, "");
  if (page.startsWith("journal/")) {
    query.set("date", page.slice("journal/".length));
    page = "journal";
  } else if (page.startsWith("admin/") && page !== "admin/new") {
    query.set("entry", page.slice("admin/".length));
    page = "admin";
  }
  return `${base}${page ? `${page}/` : ""}${query.size ? `?${query}` : ""}`;
}

export function currentRoute(): string {
  const page = location.pathname.slice(base.length)
    .replace(/(^|\/)index\.html$/, "").replace(/\/+$/, "");
  const query = new URLSearchParams(location.search);
  if (page === "journal" && query.has("date"))
    return `/journal/${query.get("date")}`;
  if (page === "admin" && query.has("entry"))
    return `/admin/${query.get("entry")}`;
  return `/${page}${location.search}`;
}

export function restoreLegacyRoute() {
  // Ignore ordinary anchors and authentication fragments.
  if (location.hash.startsWith("#/")) {
    const route = location.hash.slice(1);
    const url = new URL(routeHref(route), location.origin);
    for (const [key, value] of new URLSearchParams(location.search)) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    location.replace(url.pathname + url.search);
    return true;
  }
  return false;
}

export function navigate(route: string) {
  location.assign(routeHref(route));
}
