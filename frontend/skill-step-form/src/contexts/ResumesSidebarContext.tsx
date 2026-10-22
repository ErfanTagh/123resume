import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "resumes-sidebar-collapsed";

type ResumesSidebarContextValue = {
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
  toggle: () => void;
};

const ResumesSidebarContext = createContext<ResumesSidebarContextValue | null>(null);

function readInitialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === "true";
  } catch {
    // Private browsing / blocked storage — fall through.
  }
  return typeof window !== "undefined" && window.innerWidth < 1024;
}

export function ResumesSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(readInitialCollapsed);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore persistence failures.
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore persistence failures.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggle }),
    [collapsed, setCollapsed, toggle],
  );

  return (
    <ResumesSidebarContext.Provider value={value}>
      {children}
    </ResumesSidebarContext.Provider>
  );
}

export function useResumesSidebar() {
  const ctx = useContext(ResumesSidebarContext);
  if (!ctx) {
    throw new Error("useResumesSidebar must be used within ResumesSidebarProvider");
  }
  return ctx;
}
