import { useCallback, useMemo, useState } from "react";
import type { HiredAtEmployer } from "./hiredAtCompanies";
import { hiredAtLocalLogoUrls } from "./hiredAtCompanies";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Logo area inside the combined employer card (no own border — card wraps logo + name). */
const LOGO_AREA =
  "flex h-[5.25rem] w-full shrink-0 items-center justify-center overflow-hidden rounded-t-2xl border-b border-border bg-muted/30 px-2 shadow-inner dark:bg-muted/25 sm:h-24 sm:px-2.5";

function remoteImgMaxClass(id: string): string {
  if (id === "amazon") return "max-h-[4.95rem] sm:max-h-[5.65rem]";
  if (id === "sap") return "max-h-[4.35rem] sm:max-h-[5.15rem]";
  return "max-h-[3.65rem] sm:max-h-[4.35rem]";
}

function localImgMaxClass(id: string): string {
  if (id === "amazon") return "max-h-[5.15rem] sm:max-h-[5.75rem]";
  if (id === "sap") return "max-h-[4.85rem] sm:max-h-[5.45rem]";
  return "max-h-[4.35rem] sm:max-h-[4.85rem]";
}

type Props = {
  employer: HiredAtEmployer;
  className?: string;
};

export function HiredAtEmployerLogo({ employer, className }: Props) {
  const sources = useMemo(
    () => [...hiredAtLocalLogoUrls(employer.id), ...employer.logoSrc],
    [employer.id, employer.logoSrc],
  );

  const [index, setIndex] = useState(0);
  const [dead, setDead] = useState(sources.length === 0);

  const handleError = useCallback(() => {
    if (index < sources.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setDead(true);
    }
  }, [index, sources.length]);

  if (dead || sources.length === 0) {
    return (
      <div className={cn(LOGO_AREA, "bg-muted/50 dark:bg-muted/30", className)} title={employer.name}>
        <span className="text-xs font-bold tracking-tight text-primary/80 sm:text-sm">
          {initialsFromName(employer.name)}
        </span>
      </div>
    );
  }

  const current = sources[index]!;
  const isLocalMark = current.startsWith("/logos/");
  const isDfkiLocal = employer.id === "dfki" && isLocalMark;

  return (
    <div
      className={cn(
        LOGO_AREA,
        isLocalMark && !isDfkiLocal && "px-0",
        className,
      )}
      title={employer.name}
    >
      <img
        key={`${employer.id}-${index}`}
        src={current}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(
          "max-w-full object-contain object-center",
          isLocalMark && "min-h-0 min-w-0",
          isLocalMark ? localImgMaxClass(employer.id) : remoteImgMaxClass(employer.id),
        )}
        onError={handleError}
      />
      <span className="sr-only">{employer.name}</span>
    </div>
  );
}
