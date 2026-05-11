import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Dark mode toggle button — lưu vào localStorage, tự động apply class .dark lên <html>.
 * Không đụng bất kỳ logic nghiệp vụ nào.
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
    // Add transitioning class for smooth theme change
    root.classList.add("transitioning-theme");
    
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("sr-theme", isDark ? "dark" : "light");

    // Remove transitioning class after animation completes
    const timer = setTimeout(() => root.classList.remove("transitioning-theme"), 350);
    return () => clearTimeout(timer);
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      title={isDark ? "Chuyển sang sáng" : "Chuyển sang tối"}
      aria-label="Toggle dark mode"
    >
      <Sun className={cn(
        "h-4 w-4 transition-all duration-300",
        isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
      )} />
      <Moon className={cn(
        "absolute h-4 w-4 transition-all duration-300",
        isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
      )} />
    </button>
  );
}
