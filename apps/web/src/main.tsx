import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./store/AuthContext";
import { App } from "./App";
import { warmUpApi } from "./services/warmUp";
import "./styles/global.css";
import "./styles/auth.css";
import "./styles/layout.css";
import "./styles/tracking.css";
import "./styles/routines.css";
import "./styles/home.css";
import "./styles/plan.css";
import "./styles/calendar.css";
import "./styles/athlete-cycle.css";
import "./styles/week-views.css";
import "./styles/board.css";
import "./styles/athletes.css";
import "./styles/library.css";
import { initAnalytics } from "./lib/analytics";
import "./styles/landing.css";

warmUpApi();
initAnalytics();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
