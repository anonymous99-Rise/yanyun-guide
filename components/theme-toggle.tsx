"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("yy-theme", next ? "dark" : "light");
    } catch {
      /* storage 被禁用时忽略 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "切换到宣纸浅色" : "切换到夜行深色"}
      className="rounded-md border border-border px-2.5 py-1.5 text-sm text-muted transition hover:border-accent hover:text-accent"
    >
      {dark ? "宣纸" : "夜行"}
    </button>
  );
}
