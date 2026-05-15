import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Dark mode toggle button - luu localStorage, apply class .dark len <html>.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("sr-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("transitioning-theme");

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("sr-theme", isDark ? "dark" : "light");

    const timer = setTimeout(() => root.classList.remove("transitioning-theme"), 350);
    return () => clearTimeout(timer);
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2",
        isDark
          ? "border-primary/55 bg-primary/12 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.25)] hover:bg-primary/20 hover:text-primary focus-visible:ring-primary/70"
          : "border-border/65 bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm focus-visible:ring-ring",
        className
      )}
      title={isDark ? "Chuyển sang sáng" : "Chuyển sang tối"}
      aria-label="Toggle dark mode"
      aria-pressed={isDark}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all duration-300",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )}
      />
    </button>
  );
}
