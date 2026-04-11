import { useState, useEffect, useCallback, useRef } from "react";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "atlas_admin_locked";
const LAST_ACTIVITY_KEY = "atlas_admin_last_activity";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

/**
 * Hook qui verrouille la console après 5 min d'inactivité.
 * - Détecte l'activité utilisateur (souris, clavier, scroll, tactile)
 * - Stocke le timestamp dans localStorage (synchronisé entre onglets)
 * - Si la dernière activité date de plus de 5 min, déclenche le verrou
 * - Le verrou persiste (localStorage) — un refresh ne le réinitialise pas
 */
export function useIdleLock(enabled: boolean = true) {
  const [locked, setLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recordActivity = useCallback(() => {
    if (locked) return; // Don't update activity while locked
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      /* ignore */
    }
  }, [locked]);

  const lock = useCallback(() => {
    setLocked(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const unlock = useCallback(() => {
    setLocked(false);
    lastActivityRef.current = Date.now();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Restore last activity from localStorage
    try {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (stored) {
        const last = parseInt(stored, 10);
        if (!Number.isNaN(last)) {
          lastActivityRef.current = last;
          // If more than 5 min have passed since stored activity, lock immediately
          if (Date.now() - last > IDLE_TIMEOUT_MS) {
            lock();
            return;
          }
        }
      }
    } catch {
      /* ignore */
    }

    // Listen to user activity
    const handleActivity = () => recordActivity();
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }));

    // Check every 10s if we should lock
    checkIntervalRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= IDLE_TIMEOUT_MS && !locked) {
        lock();
      }
    }, 10000);

    // Sync lock state across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setLocked(e.newValue === "1");
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handleActivity));
      window.removeEventListener("storage", handleStorage);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [enabled, recordActivity, lock, locked]);

  return { locked, lock, unlock, recordActivity };
}
