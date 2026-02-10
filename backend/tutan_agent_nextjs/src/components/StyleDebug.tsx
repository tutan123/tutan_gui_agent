"use client";

import { useEffect, useMemo, useState } from "react";

type TailwindProbeResult = {
  backgroundColor: string;
  paddingLeft: string;
  color: string;
  fontSize: string;
  fontWeight: string;
};

function safeGetLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function isStyleDebugEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const byQuery = params.get("__style_debug") === "1" || params.get("__style_debug") === "true";
    const byStorage = safeGetLocalStorageItem("TUTAN_STYLE_DEBUG") === "1";
    return byQuery || byStorage;
  } catch {
    return false;
  }
}

function runTailwindProbe(): TailwindProbeResult | null {
  const el = document.createElement("div");
  el.setAttribute("data-tw-probe", "1");
  el.className = "p-4 bg-red-500 text-white text-sm font-bold";
  el.style.position = "absolute";
  el.style.left = "-9999px";
  el.style.top = "-9999px";
  document.body.appendChild(el);

  const cs = window.getComputedStyle(el);
  const result: TailwindProbeResult = {
    backgroundColor: cs.backgroundColor,
    paddingLeft: cs.paddingLeft,
    color: cs.color,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
  };

  el.remove();
  return result;
}

function looksLikeTailwindApplied(probe: TailwindProbeResult | null): boolean {
  if (!probe) return false;
  // Very conservative checks:
  // - padding-left should be 16px from p-4
  // - background-color should not be transparent from bg-red-500
  const paddingOk = probe.paddingLeft === "16px";
  const bgOk =
    probe.backgroundColor !== "rgba(0, 0, 0, 0)" &&
    probe.backgroundColor !== "transparent" &&
    probe.backgroundColor !== "";
  return paddingOk && bgOk;
}

function injectFallbackCss(): void {
  if (document.getElementById("tutan-fallback-css")) return;

  const style = document.createElement("style");
  style.id = "tutan-fallback-css";
  style.textContent = `
/* Fallback CSS: only used when Tailwind appears to be missing at runtime */
html, body { height: 100%; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: #f8fafc; color: #0f172a; }
button, input, select { font: inherit; }

/* Layout: based on semantic tags used in app */
aside { width: 260px; background: #ffffff; border-right: 1px solid #e2e8f0; }
main { flex: 1; min-width: 0; }
header { background: #ffffff; border-bottom: 1px solid #e2e8f0; }

/* Make buttons/inputs readable */
button { cursor: pointer; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
input, select { padding: 10px 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: #fff; }

/* App root helpers (we add data-tutan-root on the page wrapper) */
[data-tutan-root] { display: flex; height: 100vh; overflow: hidden; }
[data-tutan-root] nav button { display: flex; width: 100%; padding: 10px 12px; border: 0; background: transparent; text-align: left; }
[data-tutan-root] nav button:hover { background: #f1f5f9; }
`;

  document.head.appendChild(style);
}

export default function StyleDebug() {
  const enabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isStyleDebugEnabled();
  }, []);

  const [tailwindOk, setTailwindOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onWindowError = (event: Event) => {
      const target = event.target as unknown;
      if (target instanceof HTMLLinkElement && target.rel.includes("stylesheet")) {
        // Resource loading error for CSS (often blocked / 404 / CSP)
        console.error("[style-debug] stylesheet failed to load", {
          href: target.href,
          rel: target.rel,
          media: target.media,
          disabled: target.disabled,
          crossOrigin: target.crossOrigin,
        });
      }
    };

    window.addEventListener("error", onWindowError, true);
    return () => window.removeEventListener("error", onWindowError, true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const probe = runTailwindProbe();
    const ok = looksLikeTailwindApplied(probe);
    setTailwindOk(ok);

    if (!ok) {
      injectFallbackCss();
      console.warn("[style-debug] Tailwind probe FAILED -> fallback CSS injected", { probe });
    }

    if (!enabled) return;

    try {
      console.groupCollapsed(`[style-debug] CSS diagnostics @ ${new Date().toISOString()}`);
      console.log("[style-debug] location", window.location.href);
      console.log("[style-debug] userAgent", navigator.userAgent);
      console.log("[style-debug] tailwindProbe", probe, { tailwindOk: ok });

      const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]'));
      console.log(
        `[style-debug] stylesheet links (${links.length})`,
        links.map((l) => ({
          href: l.href,
          rel: l.rel,
          media: l.media,
          disabled: l.disabled,
          hasSheet: !!l.sheet,
        }))
      );

      const styleTags = Array.from(document.querySelectorAll<HTMLStyleElement>("style"));
      console.log(`[style-debug] <style> tags (${styleTags.length})`, styleTags.slice(0, 10));

      const sheets = Array.from(document.styleSheets || []);
      console.log(`[style-debug] document.styleSheets (${sheets.length})`);
      const sheetSummaries = sheets.map((s) => {
        const owner = s.ownerNode as any;
        const ownerTag = owner?.tagName || "(unknown)";
        const href = (s as CSSStyleSheet).href || null;
        let ruleCount: number | "SecurityError" | "unknown" = "unknown";
        try {
          ruleCount = (s as CSSStyleSheet).cssRules?.length ?? "unknown";
        } catch {
          ruleCount = "SecurityError";
        }
        return { ownerTag, href, ruleCount };
      });
      console.table(sheetSummaries);

      // Resource timing can hint if CSS was requested.
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const cssRes = resources.filter((r) => r.initiatorType === "link" && r.name.includes(".css"));
      console.log(`[style-debug] performance css resources (${cssRes.length})`, cssRes.slice(0, 20));

      console.groupEnd();
    } catch (e) {
      console.error("[style-debug] diagnostics failed", e);
    }
  }, [enabled]);

  // Lightweight overlay when debug is enabled (helps when users can't open devtools easily).
  if (!enabled) return null;

  const label =
    tailwindOk === null ? "checking..." : tailwindOk ? "Tailwind OK" : "Tailwind MISSING (fallback injected)";

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 99999,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.15)",
        background: "rgba(255,255,255,0.92)",
        color: "#0f172a",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>[style-debug]</div>
      <div>{label}</div>
      <div style={{ marginTop: 6, opacity: 0.7 }}>
        开关：URL `__style_debug=1` 或 localStorage `TUTAN_STYLE_DEBUG=1`
      </div>
    </div>
  );
}

