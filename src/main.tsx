import { createRoot } from "react-dom/client";
import "@fontsource-variable/roboto-condensed/wght.css";
import "@fontsource-variable/roboto/wght.css";
import "@fontsource-variable/sofia-sans-condensed/wght.css";
import "./styles.css";
import App from "./App";
import { restoreLegacyRoute } from "./navigation";

if (!restoreLegacyRoute()) {
  addEventListener("hashchange", restoreLegacyRoute);
  createRoot(document.getElementById("root")!).render(<App />);
}
