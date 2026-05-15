interface LogoProps {
  size?: number;
  className?: string;
  variant?: "auto" | "light" | "dark";
  showText?: boolean;
  showWordmark?: boolean;
  textClassName?: string;
}

/**
 * SmartRental Logo component with icon and wordmark variants.
 */
export default function Logo({
  size = 36,
  className = "",
  variant = "auto",
  showText = false,
  showWordmark = false,
  textClassName = "",
}: LogoProps) {
  const iconSrc = variant === "dark" ? "/logo-icon-dark.png" : "/logo-icon-light.png";
  const renderWordmark = showText || showWordmark;
  const smartTextClass =
    variant === "auto" ? "text-[#0B2342] dark:text-white" : variant === "dark" ? "text-white" : "text-[#0B2342]";
  const wordmarkFontSize = Math.max(17, Math.round(size * 0.68));

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {renderWordmark ? (
        <>
          {variant === "auto" ? (
            <img
              src="/logo-icon-light.png"
              alt="SmartRental"
              width={size}
              height={size}
              className="shrink-0 rounded-lg object-contain shadow-sm ring-1 ring-black/5 dark:ring-white/15"
              style={{ width: size, height: size }}
            />
          ) : (
            <img
              src={iconSrc}
              alt="SmartRental"
              width={size}
              height={size}
              className="shrink-0 rounded-lg object-contain"
              style={{ width: size, height: size }}
            />
          )}
          <span
            className={`inline-flex items-baseline font-bold leading-none tracking-tight dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)] ${textClassName}`}
            style={{ fontSize: wordmarkFontSize }}
          >
            <span className={smartTextClass}>Smart</span>
            <span className="text-[#D8A64A] dark:text-[#E7BB62]">Rental</span>
          </span>
        </>
      ) : (
        <>
          {variant === "auto" ? (
            <img
              src="/logo-icon-light.png"
              alt="SmartRental"
              width={size}
              height={size}
              className="shrink-0 rounded-lg object-contain shadow-sm ring-1 ring-black/5 dark:ring-white/15"
              style={{ width: size, height: size }}
            />
          ) : (
            <img
              src={iconSrc}
              alt="SmartRental"
              width={size}
              height={size}
              className="shrink-0 rounded-lg object-contain"
              style={{ width: size, height: size }}
            />
          )}
        </>
      )}
    </span>
  );
}
