import React from "react";
import versionData from "../../version.json";

interface VersionBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ className = "", showDetails = false }) => {
  const version = versionData.version || "0.2.0";

  return (
    <div
      data-testid="version-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 bg-slate-800/80 text-emerald-400 border-emerald-500/30 shadow-sm ${className}`}
      title={`FitDuo Versión ${version}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>v{version}</span>
      {showDetails && (
        <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5 font-normal">
          Paso 2
        </span>
      )}
    </div>
  );
};

export default VersionBadge;
