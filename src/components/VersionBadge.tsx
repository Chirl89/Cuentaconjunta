import React from "react";
import versionData from "../../version.json";

interface VersionBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ className = "", showDetails = false }) => {
  const version = versionData.version || "0.2.3";

  return (
    <div
      data-testid="version-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 bg-[#E6FAF4] text-[#008761] border-[#00D09C]/40 shadow-sm ${className}`}
      title={`Cuenta Conjunta Versión ${version}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D09C] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A37A]"></span>
      </span>
      <span>v{version}</span>
      {showDetails && (
        <span className="text-[10px] text-slate-500 border-l border-emerald-300 pl-1.5 font-normal">
          Paso {versionData.conversation || 4}
        </span>
      )}
    </div>
  );
};

export default VersionBadge;
