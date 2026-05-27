import { useEffect, useState } from "react";

/**
 * Desktop-only custom cursor — purple gradient arrow that follows the pointer.
 * Hidden on touch devices and small screens.
 */
const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [down, setDown] = useState(false);

  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
    const isWide =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    if (isTouch || !isWide) return;
    setEnabled(true);

    document.documentElement.classList.add("custom-cursor-active");

    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!enabled) return null;

  return (
    <svg
      aria-hidden
      width="32"
      height="32"
      viewBox="0 0 512 512"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        transform: `translate(-2px, -2px) scale(${down ? 0.9 : 1})`,
        pointerEvents: "none",
        zIndex: 999999,
        transition: "transform 80ms ease",
        filter: "drop-shadow(0 4px 10px rgba(120, 0, 200, 0.45))",
      }}
    >
      <defs>
        <linearGradient id="cc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="55%" stopColor="#a21caf" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>
      </defs>
      <path
        d="M64 48 L432 232 L268 268 L232 432 Z"
        fill="url(#cc-grad)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CustomCursor;
