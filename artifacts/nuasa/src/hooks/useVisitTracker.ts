import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { dbClient } from "@/lib/db-client";
import { getSession } from "@/lib/auth";

const SESSION_KEY = "nuasa_visit_session";

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function useVisitTracker() {
  const location = useLocation();

  useEffect(() => {
    // Skip admin routes
    if (location.pathname.startsWith("/admin")) return;

    const record = async () => {
      try {
        const session = await getSession();
        await dbClient.from("site_visits").insert({
          user_id: session?.user?.id ?? null,
          session_id: getSessionId(),
          path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch (err) {
        // Silent fail - tracking should never break the app
        console.debug("Visit tracking failed", err);
      }
    };
    record();
  }, [location.pathname]);
}