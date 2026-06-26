import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

const container = document.getElementById("root")!;

// When the page was prerendered (react-snap saved static HTML), the root already
// has markup — hydrate it so React reuses it. Otherwise mount fresh as usual.
if (container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
