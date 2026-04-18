"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle } from "react-icons/fi";
import { useLang } from "@/lib/LanguageContext";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useLang();
  // Defaults pull from i18n so en/bn switch translates the modal too.
  const resolvedTitle = title ?? t("confirm.title");
  const resolvedConfirm = confirmLabel ?? t("confirm.yesDelete");
  const resolvedCancel = cancelLabel ?? t("confirm.cancel");
  const deletingLabel = t("confirm.deleting");
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-800">{resolvedTitle}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                {resolvedCancel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? deletingLabel : resolvedConfirm}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
