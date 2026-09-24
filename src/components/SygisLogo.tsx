import React from "react";

interface SygisLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  showSubtitle?: boolean;
  textClassName?: string;
  variant?: "dark" | "light" | "transparent";
}

export const SygisLogo: React.FC<SygisLogoProps> = ({
  size = 36,
  className = "",
  showText = false,
  showSubtitle = true,
  textClassName = "",
  variant = "dark",
}) => {
  const bgFill =
    variant === "dark"
      ? "#0D1B2A"
      : variant === "light"
      ? "#F8FAFC"
      : "transparent";

  const orbitStroke = variant === "light" ? "#1E293B" : "#E0E1DD";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="Sygis Logo"
      >
        <defs>
          <linearGradient id="sygisCosmosGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D1B2A" />
            <stop offset="100%" stopColor="#121E2E" />
          </linearGradient>

          <linearGradient id="sygisOrbitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={orbitStroke} stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor={orbitStroke} stopOpacity="0.8" />
          </linearGradient>

          <radialGradient id="sygisEclipseGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="35%" stopColor="#00F5D4" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#00F5D4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00F5D4" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="sygisTurquoiseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F5D4" />
            <stop offset="100%" stopColor="#00BFA5" />
          </linearGradient>

          <filter id="sygisNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background pill / container if not transparent */}
        {variant !== "transparent" && (
          <rect
            width="512"
            height="512"
            rx="128"
            fill="url(#sygisCosmosGrad)"
          />
        )}

        {/* Outer ambient glow of the financial eclipse */}
        <circle cx="256" cy="256" r="130" fill="url(#sygisEclipseGlow)" opacity="0.65" />

        {/* 1. Left celestial orbit (Person A) */}
        <circle
          cx="176"
          cy="256"
          r="105"
          fill="none"
          stroke="url(#sygisOrbitGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.88"
        />

        {/* 2. Right celestial orbit (Person B) */}
        <circle
          cx="336"
          cy="256"
          r="105"
          fill="none"
          stroke="url(#sygisOrbitGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.88"
        />

        {/* 3. Center orbit: The Syzygy alignment & shared union (∞) */}
        <circle
          cx="256"
          cy="256"
          r="105"
          fill="none"
          stroke="url(#sygisTurquoiseGrad)"
          strokeWidth="20"
          strokeLinecap="round"
          filter="url(#sygisNeonGlow)"
        />

        {/* Central Intersection: Abstract Cutout Coin Silhouette */}
        <circle
          cx="256"
          cy="256"
          r="54"
          fill="none"
          stroke="#00F5D4"
          strokeWidth="8"
          opacity="0.95"
        />

        {/* Central burst of light (The Eclipse Flare) */}
        <circle cx="256" cy="256" r="32" fill="url(#sygisEclipseGlow)" />

        {/* 4-point radiant stellar flare of financial alignment */}
        <path
          d="M 256 218 Q 256 256 218 256 Q 256 256 256 294 Q 256 256 294 256 Q 256 256 256 218 Z"
          fill="#FFFFFF"
        />
        <circle cx="256" cy="256" r="8" fill="#00F5D4" />
      </svg>

      {showText && (
        <div className={`flex flex-col leading-none ${textClassName}`}>
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 font-sans">
            Sygis
          </span>
          {showSubtitle && (
            <span className="text-[10px] font-bold text-[#00A37A] tracking-wider uppercase mt-0.5">
              Finanzas Compartidas
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SygisLogo;
