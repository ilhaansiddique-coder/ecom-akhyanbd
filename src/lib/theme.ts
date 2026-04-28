/**
 * ─── Site Design Theme ───
 * Single source of truth for all UI classes across the site.
 * Import and use everywhere to keep the design consistent.
 *
 * Usage:
 *   import { theme } from "@/lib/theme";
 *   <input className={theme.input} />
 *   <button className={theme.btn.primary}>Save</button>
 */

// ─── Colors ───
const colors = {
  primary: "#0f5931",
  primaryHover: "#12693a",
};

// ─── Inputs ───
const input = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-primary focus:outline-none transition-colors";
const inputSearch = "w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-primary focus:outline-none";
const textarea = `${input} resize-none`;
const select = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-primary focus:outline-none bg-white";
const selectSmall = "px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:border-primary focus:outline-none bg-white";
const checkbox = "w-4 h-4 accent-primary rounded";

// ─── Labels ───
const label = "block text-xs font-medium text-gray-600 mb-1";
const sectionTitle = "text-xs font-bold text-gray-400 uppercase tracking-wide";

// ─── Buttons ───
const btn = {
  primary: "px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50",
  primaryFull: "flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50",
  cancel: "flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors",
  danger: "px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors",
  ghost: "px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors",
  outline: "px-4 py-2 border border-primary text-primary rounded-xl text-sm font-medium hover:bg-primary hover:text-white transition-colors disabled:opacity-50",
  add: "flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors",
  icon: {
    edit: "p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors",
    delete: "p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors",
    view: "p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors",
    default: "p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors",
  },
};

// ─── Tables ───
const table = {
  wrapper: "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
  head: "bg-gray-50 border-b border-gray-100",
  th: "px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap",
  row: "hover:bg-gray-50 transition-colors",
  td: "px-4 py-3",
  empty: "py-12 text-center text-gray-400",
};

// ─── Modals ───
const modal = {
  overlay: "fixed inset-0 z-50 flex items-center justify-center p-4",
  backdrop: "absolute inset-0 bg-black/50",
  box: (size: "sm" | "md" | "lg" | "xl" = "md") => {
    const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };
    return `relative z-10 bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`;
  },
  header: "flex items-center justify-between px-6 py-4 border-b border-gray-100",
  title: "text-base font-bold text-gray-800",
  close: "text-gray-400 hover:text-gray-600 p-1",
  body: "p-6 space-y-4",
  footer: "flex gap-3 pt-2",
};

// ─── Badges ───
const badge = {
  base: "text-xs px-2 py-1 rounded-full font-medium",
  lg: "text-xs px-3 py-1.5 rounded-full font-medium",
  // Status colors
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-orange-100 text-orange-700",
  // Type colors
  admin: "bg-purple-100 text-purple-700",
  customer: "bg-blue-100 text-blue-700",
  percentage: "bg-blue-100 text-blue-700",
  fixed: "bg-orange-100 text-orange-700",
  published: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  hero: "bg-purple-100 text-purple-700",
};

// ─── Cards / Sections ───
const card = "bg-gray-50 rounded-xl p-4 space-y-2.5";
const divider = "border-t border-gray-100";

// ─── Upload ───
const upload = {
  zone: (active: boolean) =>
    `relative border-2 border-dashed rounded-xl transition-colors ${
      active ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
    }`,
  changeBtn: "cursor-pointer px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors",
  deleteBtn: "px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium text-red-600 transition-colors",
};

// ─── Text ───
const text = {
  price: "font-semibold text-primary whitespace-nowrap",
  muted: "text-gray-500",
  small: "text-xs text-gray-400",
};

// ─── Motion presets (for framer-motion) ───
const motion = {
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slideUp: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
  },
  pageIn: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } },
};

// ─── Icon sizes ───
const icon = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export const theme = {
  colors,
  input,
  inputSearch,
  textarea,
  select,
  selectSmall,
  checkbox,
  label,
  sectionTitle,
  btn,
  table,
  modal,
  badge,
  card,
  divider,
  upload,
  text,
  motion,
  icon,
};
