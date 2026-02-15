import { useState, useEffect } from "react";
import { DEFAULT_CONTENT, type SiteContent } from "../config/content";

const STORAGE_KEY = "atlas_site_content_v2";

export function useContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setContent({ ...DEFAULT_CONTENT, ...parsed });
      }
    } catch { /* ignore corrupted data */ }
    setLoaded(true);
  }, []);

  const save = (newContent: SiteContent) => {
    setContent(newContent);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newContent));
    } catch (e) {
      console.error("Save error", e);
    }
  };

  const reset = () => {
    setContent(DEFAULT_CONTENT);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  };

  return { content, save, reset, loaded };
}
