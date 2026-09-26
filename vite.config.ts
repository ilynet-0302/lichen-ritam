import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function staticRoutes(): Plugin {
  return {
    name: "journal-static-routes",
    enforce: "post",
    generateBundle(_, bundle) {
      const index = bundle["index.html"];
      if (!index || index.type !== "asset")
        throw new Error("The website entry page was not generated.");
      const html = String(index.source);
      const home = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
      if (!home) throw new Error("The website canonical URL is missing.");
      // Real entry files return HTTP 200 on Pages, including direct visits
      // and link-preview crawlers that do not execute JavaScript.
      for (const page of ["about", "compare", "journal", "admin", "admin/new", "settings"]) {
        const url = new URL(`${page}/`, home).href;
        let source = html
          .replace(`rel="canonical" href="${home}"`, `rel="canonical" href="${url}"`)
          .replace(`property="og:url" content="${home}"`, `property="og:url" content="${url}"`);
        if (page.startsWith("admin") || page === "settings")
          source = source.replace("</head>", '<meta name="robots" content="noindex, nofollow" />\n  </head>');
        this.emitFile({ type: "asset", fileName: `${page}/index.html`, source });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), staticRoutes()],
  base: process.env.BASE_PATH || "/",
  build: { target: "es2022" },
});
