"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { FiCalendar, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useLang } from "@/lib/LanguageContext";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

function usePresets() {
  const { t } = useLang();
  // Negative `days` values are sentinels for non-rolling-window ranges
  // (handled in getPresetRange below). -3 = yesterday only (single day).
  return [
    { label: t("date.today"), days: 0 },
    { label: t("date.yesterday"), days: -3 },
    { label: t("date.last7"), days: 7 },
    { label: t("date.last30"), days: 30 },
    { label: t("date.last90"), days: 90 },
    { label: t("date.thisMonth"), days: -1 },
    { label: t("date.lastMonth"), days: -2 },
    { label: t("date.allTime"), days: -99 },
  ];
}

const WEEKDAYS_BN = ["র", "সো", "ম", "বু", "বৃ", "শু", "শ"];
const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPresetRange(days: number): { from: string; to: string } {
  const today = new Date();
  const to = toDateStr(today);
  if (days === 0) return { from: to, to };
  // Yesterday only — single day, both endpoints set to yesterday's date.
  if (days === -3) {
    const yest = toDateStr(new Date(today.getTime() - 86400000));
    return { from: yest, to: yest };
  }
  if (days === -1) {
    return { from: toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  }
  if (days === -2) {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toDateStr(first), to: toDateStr(last) };
  }
  // All time — no date constraint
  if (days === -99) return { from: "", to: "" };
  return { from: toDateStr(new Date(today.getTime() - days * 86400000)), to };
}

function formatDate(dateStr: string, lang: string = "bn"): string {
  if (!dateStr) return "";
  const locale = lang === "en" ? "en-US" : "bn-BD";
  return new Date(dateStr).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

// Use global toBn from utils (language-aware)
import { toBn } from "@/utils/toBn";

// ─── Mini Calendar Component ───
function MiniCalendar({
  month,
  year,
  rangeStart,
  rangeEnd,
  hoverDate,
  onDateClick,
  onDateHover,
  lang,
}: {
  month: number;
  year: number;
  rangeStart: string;
  rangeEnd: string;
  hoverDate: string;
  onDateClick: (d: string) => void;
  onDateHover: (d: string) => void;
  lang?: string;
}) {
  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const cells: { date: string; day: number; outside: boolean }[] = [];

    // Previous month padding
    const startPad = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevDays - i);
      cells.push({ date: toDateStr(d), day: prevDays - i, outside: true });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ date: toDateStr(new Date(year, month, i)), day: i, outside: false });
    }

    // Next month padding
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({ date: toDateStr(d), day: i, outside: true });
    }

    return cells;
  }, [month, year]);

  const today = toDateStr(new Date());

  const effectiveEnd = rangeEnd || hoverDate;

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {(lang === "en" ? WEEKDAYS_EN : WEEKDAYS_BN).map((d) => (
          <div key={d} className="h-8 flex items-center justify-center text-[10px] font-semibold text-gray-400 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((cell) => {
          if (cell.outside) {
            return (
              <div key={cell.date + "-out-" + cell.day} className="h-8 flex items-center justify-center text-xs text-gray-200">
                {toBn(cell.day)}
              </div>
            );
          }

          const isToday = cell.date === today;
          const isStart = cell.date === rangeStart;
          const isEnd = cell.date === (rangeEnd || (hoverDate && rangeStart ? hoverDate : ""));

          const lo = rangeStart && effectiveEnd
            ? (rangeStart < effectiveEnd ? rangeStart : effectiveEnd)
            : "";
          const hi = rangeStart && effectiveEnd
            ? (rangeStart < effectiveEnd ? effectiveEnd : rangeStart)
            : "";
          const inRange = lo && hi && cell.date >= lo && cell.date <= hi;
          const isEndpoint = isStart || isEnd;

          return (
            <div
              key={cell.date}
              onClick={() => onDateClick(cell.date)}
              onMouseEnter={() => onDateHover(cell.date)}
              className={`
                relative h-8 flex items-center justify-center text-xs cursor-pointer transition-all
                ${inRange && !isEndpoint ? "bg-[var(--primary)]/10" : ""}
                ${isEndpoint ? "bg-[var(--primary)] text-white rounded-lg font-semibold shadow-sm" : ""}
                ${!isEndpoint && !inRange ? "hover:bg-gray-100 rounded-lg" : ""}
                ${isToday && !isEndpoint ? "font-bold text-[var(--primary)]" : ""}
                ${inRange && isStart && !isEnd ? "rounded-l-lg rounded-r-none" : ""}
                ${inRange && isEnd && !isStart ? "rounded-r-lg rounded-l-none" : ""}
                ${inRange && isStart && isEnd ? "rounded-lg" : ""}
              `}
            >
              <span className="relative z-10">{toBn(cell.day)}</span>
              {isToday && !isEndpoint && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--primary)]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main DateRangePicker ───
export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const { t, lang } = useLang();
  const PRESETS = usePresets();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  // Selection state
  const [selecting, setSelecting] = useState(false);
  const [tempStart, setTempStart] = useState(from);
  const [tempEnd, setTempEnd] = useState(to);
  const [hoverDate, setHoverDate] = useState("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setTempStart(from);
    setTempEnd(to);
  }, [from, to]);

  const handleDateClick = (d: string) => {
    if (!selecting || !tempStart) {
      setTempStart(d);
      setTempEnd("");
      setSelecting(true);
    } else {
      const start = d < tempStart ? d : tempStart;
      const end = d < tempStart ? tempStart : d;
      setTempStart(start);
      setTempEnd(end);
      setSelecting(false);
      onChange(start, end);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const hasFilter = from || to;
  // Compact labels for common single-day picks: today / yesterday / single date.
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  let label: string;
  if (!hasFilter) {
    label = t("date.filter");
  } else if (from && to && from === to) {
    if (from === todayStr) label = t("date.today");
    else if (from === yesterdayStr) label = (lang === "en" ? "Yesterday" : "গতকাল");
    else label = formatDate(from, lang);
  } else {
    label = `${formatDate(from, lang)} — ${formatDate(to, lang)}`;
  }

  // Second calendar month
  const month2 = viewMonth === 11 ? 0 : viewMonth + 1;
  const year2 = viewMonth === 11 ? viewYear + 1 : viewYear;

  return (
    <div ref={ref} className="relative w-full md:w-auto">
      {/* Trigger button — w-full on mobile so it stays within its flex slot,
          truncates long labels (e.g. "Apr 24 — Apr 24") instead of overlapping siblings */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full md:w-auto flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-200 min-w-0 ${
          hasFilter
            ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-medium shadow-sm shadow-[var(--primary)]/10"
            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:shadow-sm"
        }`}
      >
        <FiCalendar className="w-4 h-4 shrink-0" />
        <span className="truncate min-w-0 flex-1 text-left">{label}</span>
        {hasFilter && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange("", ""); setOpen(false); }}
            className="ml-0.5 p-0.5 hover:bg-red-100 rounded-full text-red-500 transition-colors shrink-0"
          >
            <FiX className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Mobile overlay backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Dropdown */}
      {open && (
        <div className={`
          z-50 bg-white border border-gray-100 shadow-2xl shadow-black/10 overflow-hidden
          fixed inset-x-3 bottom-3 top-auto rounded-2xl max-h-[85vh] overflow-y-auto
          md:absolute md:fixed-auto md:inset-auto md:top-full md:left-0 md:mt-2 md:rounded-2xl md:max-h-none md:overflow-visible
        `} style={{ animation: "fadeSlideIn 0.15s ease-out" }}>

          {/* Mobile header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 md:hidden">
            <span className="text-sm font-semibold text-gray-800">{t("date.selectDate")}</span>
            <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Presets — horizontal on mobile, sidebar on desktop */}
          <div className="flex flex-col md:flex-row">
            {/* Presets: horizontal chips on mobile, vertical sidebar on desktop */}
            <div className="md:w-32 md:bg-gray-50/80 md:border-r md:border-gray-100 p-3 md:space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1 hidden md:block">{t("date.quickSelect")}</p>
              <div className="flex flex-wrap gap-1.5 md:flex-col md:gap-0 md:space-y-1">
                {PRESETS.map((p) => {
                  const range = getPresetRange(p.days);
                  const isActive = from === range.from && to === range.to;
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        onChange(range.from, range.to);
                        setTempStart(range.from);
                        setTempEnd(range.to);
                        setSelecting(false);
                        setOpen(false);
                      }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 md:w-full md:text-left ${
                        isActive
                          ? "bg-[var(--primary)] text-white shadow-sm"
                          : "bg-gray-100 md:bg-transparent text-gray-600 hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendars */}
            <div className="p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-800">
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-4 md:gap-8 text-sm font-semibold text-gray-800">
                  <span suppressHydrationWarning>{(lang === "en" ? MONTHS_EN : MONTHS_BN)[viewMonth]} {toBn(viewYear)}</span>
                  <span className="hidden md:inline" suppressHydrationWarning>{(lang === "en" ? MONTHS_EN : MONTHS_BN)[month2]} {toBn(year2)}</span>
                </div>
                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-800">
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar grids — single on mobile, double on desktop */}
              <div className="flex gap-4">
                <div className="w-full md:w-56">
                  <MiniCalendar
                    month={viewMonth}
                    year={viewYear}
                    rangeStart={tempStart}
                    rangeEnd={tempEnd}
                    hoverDate={selecting ? hoverDate : ""}
                    onDateClick={handleDateClick}
                    onDateHover={setHoverDate}
                    lang={lang}
                  />
                </div>
                <div className="w-px bg-gray-100 hidden md:block" />
                <div className="w-56 hidden md:block">
                  <MiniCalendar
                    month={month2}
                    year={year2}
                    rangeStart={tempStart}
                    rangeEnd={tempEnd}
                    hoverDate={selecting ? hoverDate : ""}
                    onDateClick={handleDateClick}
                    onDateHover={setHoverDate}
                    lang={lang}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 pt-3 border-t border-gray-100 gap-2">
                <div className="text-xs text-gray-400">
                  {tempStart && tempEnd
                    ? `${formatDate(tempStart, lang)} — ${formatDate(tempEnd, lang)}`
                    : tempStart
                    ? t("date.selectEnd")
                    : t("date.selectDate")}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {hasFilter && (
                    <button
                      onClick={() => { onChange("", ""); setTempStart(""); setTempEnd(""); setSelecting(false); setOpen(false); }}
                      className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      {t("date.reset")}
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-xs font-medium text-white bg-[var(--primary)] hover:opacity-90 rounded-lg transition-opacity shadow-sm"
                  >
                    {t("date.done")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
