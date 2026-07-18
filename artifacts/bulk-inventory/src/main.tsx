import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Prepend the app's base path (e.g. "/inventory") to all API calls so the
// generated client's "/api/..." URLs resolve to "/inventory/api/...".
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
if (basePath) {
  setBaseUrl(basePath);
}

setAuthTokenGetter(() => localStorage.getItem("auth_token"));

createRoot(document.getElementById("root")!).render(<App />);
