import * as React from "react";
import { cn } from "@/utils/cn";

/* ================================
   Hook: Click outside
================================ */
function useOutsideClick<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  callback: () => void
) {
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return;

      if (!ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}

/* ================================
   Dropdown
================================ */
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  useOutsideClick(containerRef, () => setIsOpen(false));

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen((prev) => !prev)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-56 rounded-md border bg-white shadow-lg ring-1 ring-black ring-opacity-5",
            "animate-in fade-in zoom-in-95 duration-100",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          <div
            className="py-1"
            onClick={() => setIsOpen(false)}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================
   Dropdown Item
================================ */
interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  danger?: boolean;
}

export function DropdownItem({
  children,
  onClick,
  className,
  danger = false,
}: DropdownItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center px-4 py-2 text-sm transition-colors",
        "hover:bg-gray-100",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ================================
   Dropdown Separator
================================ */
export function DropdownSeparator() {
  return <div className="my-1 h-px bg-gray-200" />;
}

/* ================================
   Dropdown Label
================================ */
export function DropdownLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}
