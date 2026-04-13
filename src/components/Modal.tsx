"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg" | "xl";
  persistent?: boolean; // Don't close on backdrop click
  children: ReactNode;
}

export default function Modal({ open, onClose, title, size = "md", persistent, children }: ModalProps) {
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onMouseDown={persistent ? undefined : onClose}
          />

          {/* Modal box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative z-10 bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] flex flex-col overflow-hidden`}
          >
            {/* Header — fixed at top */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-800">{title}</h2>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body — scrollbar inside rounded corners */}
            <div className="overflow-y-auto overscroll-contain modal-scroll">
              {children}
            </div>
          </motion.div>

          {/* Scoped scrollbar styles */}
          <style jsx global>{`
            .modal-scroll {
              scrollbar-width: thin;
              scrollbar-color: #d1d5db transparent;
            }
            .modal-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .modal-scroll::-webkit-scrollbar-track {
              background: transparent;
              margin: 4px 0;
            }
            .modal-scroll::-webkit-scrollbar-thumb {
              background: #d1d5db;
              border-radius: 99px;
            }
            .modal-scroll::-webkit-scrollbar-thumb:hover {
              background: #9ca3af;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
