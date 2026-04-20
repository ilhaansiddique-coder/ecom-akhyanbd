"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface InlineSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  fullWidth?: boolean;
  placeholder?: string;
  absolute?: boolean; // use relative/absolute positioning instead of fixed (for non-dashboard pages)
  variant?: "default" | "input"; // "input" matches storefront form input height/border
}

export default function InlineSelect({ value, options, onChange, fullWidth, placeholder, absolute, variant = "default" }: InlineSelectProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean; width: number } | null>(null);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return null;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 220;
    return {
      top: openUp ? rect.top : rect.bottom + 4,
      left: rect.left,
      openUp,
      width: rect.width,
    };
  }, []);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      setPos(null);
    } else {
      // Calculate position BEFORE opening so there's no flash
      const p = calcPos();
      if (p) {
        setPos(p);
        setOpen(true);
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
      setPos(null);
    };
    const onScroll = () => {
      const p = calcPos();
      if (p) setPos(p);
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, calcPos]);

  const selected = options.find((o) => o.value === value);

  const isInput = variant === "input";
  const triggerClass = isInput
    ? `flex items-center gap-2 px-4 py-3 border border-border rounded-xl text-sm text-foreground bg-white hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all ${fullWidth ? "w-full" : "min-w-32"}`
    : `flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 focus:border-[#0f5931] focus:outline-none transition-colors ${fullWidth ? "w-full" : "min-w-32"}`;

  const trigger = (
    <button
      type="button"
      ref={btnRef}
      onClick={handleToggle}
      className={triggerClass}
    >
      {selected?.color && <span className={`w-2 h-2 rounded-full shrink-0 ${selected.color}`} />}
      <span className={`flex-1 text-left ${isInput ? (selected ? "text-foreground" : "text-text-light") : "text-gray-700"}`}>{selected?.label || placeholder || "—"}</span>
      <FiChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );

  const dropdown = (
    <div
      ref={dropRef}
      className="bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/10"
      style={{ animation: "fadeSlideIn 0.12s ease-out", minWidth: 160 }}
    >
      <div className="p-1 max-h-56 overflow-y-auto inline-select-scroll">
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); setPos(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isSelected
                  ? "bg-[#0f5931]/8 text-[#0f5931] font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.color && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />}
              <span className="flex-1 text-left">{opt.label}</span>
              {isSelected && <FiCheck className="w-3.5 h-3.5 text-[#0f5931] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Absolute mode: stays inside normal document flow (for public pages)
  if (absolute) {
    return (
      <div className="relative">
        {trigger}
        {open && (
          <div className="absolute z-50 top-full left-0 mt-1 w-full">
            {dropdown}
          </div>
        )}
      </div>
    );
  }

  // Fixed mode: escapes overflow containers (for dashboard modals/tables)
  return (
    <>
      {trigger}
      {open && pos && (
        <div
          ref={dropRef}
          className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/10"
          style={{
            top: pos.openUp ? "auto" : pos.top,
            bottom: pos.openUp ? window.innerHeight - pos.top + 4 : "auto",
            left: pos.left,
            minWidth: Math.max(pos.width, 160),
            animation: "fadeSlideIn 0.12s ease-out",
          }}
        >
          <div className="p-1 max-h-56 overflow-y-auto inline-select-scroll">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); setPos(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    isSelected
                      ? "bg-[#0f5931]/8 text-[#0f5931] font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.color && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />}
                  <span className="flex-1 text-left">{opt.label}</span>
                  {isSelected && <FiCheck className="w-3.5 h-3.5 text-[#0f5931] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
