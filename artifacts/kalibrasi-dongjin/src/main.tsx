import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

// PENTING:
// api-client sudah punya path /api/calibrations
// jadi baseUrl cukup sampai localhost:3000
setBaseUrl("http://localhost:3000");

setAuthTokenGetter(() => localStorage.getItem("kalibrasi-token"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);