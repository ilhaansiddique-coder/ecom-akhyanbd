"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";

interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

interface StatusFilterProps {
  value: string;
  options: StatusOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function StatusFilter({ value, options, onChange, placeholder = "ফিল্টার" }: StatusFilterProps) {
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
  const hasValue = value !== "" && value !== undefined;

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={handleToggle}
        className={`w-full md:w-auto flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-200 min-w-0 ${
          hasValue
            ? "border-[#0f5931] bg-[#0f5931]/5 text-[#0f5931] font-medium shadow-sm shadow-[#0f5931]/10"
            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm"
        }`}
      >
        {selected?.color && (
          <span className={`w-2 h-2 rounded-full shrink-0 ${selected.color}`} />
        )}
        <span className="truncate min-w-0 flex-1 text-left">{selected?.label || placeholder}</span>
        <FiChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${hasValue ? "text-[#0f5931]" : "text-gray-400"}`} />
      </button>

      {open && pos && (
        <div
          ref={dropRef}
          className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/10"
          style={{
            top: pos.openUp ? "auto" : pos.top,
            bottom: pos.openUp ? window.innerHeight - pos.top + 4 : "auto",
            left: pos.left,
            minWidth: Math.max(pos.width, 176),
            animation: "fadeSlideIn 0.12s ease-out",
          }}
        >
          <div className="p-1.5 max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); setPos(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isSelected
                      ? "bg-[#0f5931]/8 text-[#0f5931] font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.color && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />
                  )}
                  <span className="flex-1 text-left">{opt.label}</span>
                  {isSelected && (
                    <FiCheck className="w-3.5 h-3.5 text-[#0f5931] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
