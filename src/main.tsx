import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import "@lottiefiles/creator-plugins-ui/styles.css";
import "./styles.css";

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
