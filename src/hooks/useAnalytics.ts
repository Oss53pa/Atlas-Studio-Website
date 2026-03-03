import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function useAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // Track page view in activity_log
    supabase.from("activity_log").insert({
      action: "page_view",
      metadata: { path: location.pathname },
    }).then(() => {});
  }, [location.pathname]);
}
