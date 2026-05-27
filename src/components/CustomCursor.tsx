import { useEffect, useState } from "react";

/**
 * Desktop-only custom cursor: blue outer ring + orange dot that follows the pointer.
 * Hidden on touch devices and small screens.
 */
const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [down, setDown] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
    const isWide = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    if (isTouch || !isWide) return;
    setEnabled(true);

    document.documentElement.classList.add("custom-cursor-active");

    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return setHover(false);
      setHover(!!t.closest('a, button, [role="button"], input, textarea, select, label, summary'));
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseover", onOver);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseover", onOver);
    };
  }, []);

  if (!enabled) return null;

  const ringSize = hover ? 44 : 32;
  const dotSize = down ? 6 : 8;

  return (
    <>
      {/* Outer blue ring */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          width: ringSize,
          height: ringSize,
          transform: `translate(-50%, -50%) scale(${down ? 0.85 : 1})`,
          border: "2px solid #2563eb",
          borderRadius: "9999px",
          pointerEvents: "none",
          zIndex: 999999,
          transition: "width 160ms ease, height 160ms ease, transform 120ms ease, background-color 160ms ease",
          backgroundColor: hover ? "rgba(37, 99, 235, 0.12)" : "transparent",
          boxShadow: "0 0 14px rgba(37, 99, 235, 0.45)",
          mixBlendMode: "normal",
        }}
      />
      {/* Inner orange dot */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          width: dotSize,
          height: dotSize,
          transform: "translate(-50%, -50%)",
          backgroundColor: "#f97316",
          borderRadius: "9999px",
          pointerEvents: "none",
          zIndex: 1000000,
          boxShadow: "0 0 10px rgba(249, 115, 22, 0.8)",
        }}
      />
    </>
  );
};

export default CustomCursor;
