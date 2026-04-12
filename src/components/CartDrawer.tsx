"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiShoppingBag, FiTrash2, FiMinus, FiPlus } from "react-icons/fi";
import Link from "next/link";
import { useCart } from "@/lib/CartContext";
import { toBn } from "@/utils/toBn";
import { SafeNextImage } from "@/components/SafeImage";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60" onClick={onClose} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-61 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FiShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">শপিং কার্ট</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-background-alt rounded-full transition-colors" aria-label="বন্ধ করুন">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
                  <FiShoppingBag className="w-16 h-16" />
                  <p className="text-lg">আপনার কার্ট খালি</p>
                  <button onClick={onClose} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors">
                    শপিং করুন
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div key={item.id} layout className="flex gap-4 p-3 bg-background-alt rounded-xl">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-white shrink-0 relative">
                      <SafeNextImage src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-border">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 hover:text-primary transition-colors">
                            <FiMinus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-semibold w-8 text-center">{toBn(item.quantity)}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 hover:text-primary transition-colors">
                            <FiPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary">৳{toBn(item.price * item.quantity)}</span>
                          <button onClick={() => removeItem(item.id)} className="p-1.5 text-text-muted hover:text-sale-red transition-colors">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-text-body font-medium">সাবটোটাল</span>
                  <span className="text-xl font-bold text-primary">৳{toBn(totalPrice)}</span>
                </div>
                <p className="text-xs text-text-muted">শিপিং চার্জ চেকআউটে যোগ হবে</p>
                <div className="space-y-2">
                  <Link href="/checkout" className="block w-full py-3.5 bg-primary text-white text-center rounded-xl font-semibold hover:bg-primary-light transition-colors shadow-md" onClick={onClose}>
                    চেকআউট
                  </Link>
                  <button onClick={onClose} className="block w-full py-3 text-center text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors">
                    শপিং চালিয়ে যান
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
