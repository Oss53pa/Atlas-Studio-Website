import { createContext, useContext, useState, type ReactNode } from "react";

interface AppFilterContextType {
  selectedApp: string; // "all" or app id
  setSelectedApp: (id: string) => void;
  appLabel: string;
}

const AppFilterContext = createContext<AppFilterContextType>({
  selectedApp: "all",
  setSelectedApp: () => {},
  appLabel: "Toutes les apps",
});

export function AppFilterProvider({ children }: { children: ReactNode }) {
  const [selectedApp, setSelectedApp] = useState("all");
  const appLabel = selectedApp === "all" ? "Toutes les apps" : selectedApp;

  return (
    <AppFilterContext.Provider value={{ selectedApp, setSelectedApp, appLabel }}>
      {children}
    </AppFilterContext.Provider>
  );
}

export function useAppFilter() {
  return useContext(AppFilterContext);
}
