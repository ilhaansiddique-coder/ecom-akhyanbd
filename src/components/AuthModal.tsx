"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FiX, FiMail, FiLock, FiUser, FiPhone, FiKey } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { api } from "@/lib/api";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "login" | "register" | "forgot" | "reset";

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const { lang } = useLang();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [resetCode, setResetCode] = useState("");

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setPassword(""); setPasswordConfirmation(""); setResetCode(""); setError(""); setSuccess("");
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        resetForm();
        onClose();
        router.push("/dashboard");
      } else if (mode === "register") {
        await register(name, email, password, passwordConfirmation, phone);
        resetForm();
        onClose();
        router.push("/dashboard");
      } else if (mode === "forgot") {
        const res = await api.forgotPassword(email);
        setSuccess(res.message || (lang === "en" ? "Reset code sent." : "রিসেট কোড পাঠানো হয়েছে।"));
        if (res.reset_code) {
          setResetCode(res.reset_code);
        }
        setMode("reset");
      } else if (mode === "reset") {
        await api.resetPassword({ email, code: resetCode, password, password_confirmation: passwordConfirmation });
        await login(email, password);
        resetForm();
        onClose();
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const error = err as { message?: string; errors?: Record<string, string[]> };
      if (error.errors) {
        setError(Object.values(error.errors).flat().join(", "));
      } else {
        setError(error.message || (lang === "en" ? "Something went wrong" : "কিছু একটা সমস্যা হয়েছে"));
      }
    } finally {
      setLoading(false);
    }
  };

  const title = (lang === "en"
    ? { login: "Login", register: "Register", forgot: "Reset Password", reset: "Set New Password" }
    : { login: "লগইন", register: "রেজিস্টার", forgot: "পাসওয়ার্ড রিসেট", reset: "নতুন পাসওয়ার্ড সেট করুন" })[mode];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-61 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                <button onClick={onClose} className="p-2 hover:bg-background-alt rounded-full transition-colors" aria-label={lang === "en" ? "Close" : "বন্ধ করুন"}>
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs — only for login/register */}
              {(mode === "login" || mode === "register") && (
                <div className="flex border-b border-border">
                  <button
                    onClick={() => switchMode("login")}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === "login" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-foreground"}`}
                  >
                    {lang === "en" ? "Login" : "লগইন"}
                  </button>
                  <button
                    onClick={() => switchMode("register")}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === "register" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-foreground"}`}
                  >
                    {lang === "en" ? "Register" : "রেজিস্টার"}
                  </button>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-sale-red/10 text-sale-red text-sm rounded-lg">{error}</div>
                )}
                {success && (
                  <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>
                )}

                {/* === REGISTER: name field === */}
                {mode === "register" && (
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "en" ? "Your name" : "আপনার নাম"} required className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors" />
                  </div>
                )}

                {/* === EMAIL — always shown === */}
                {(mode !== "reset" || !email) && (
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={lang === "en" ? "Email" : "ইমেইল"} required className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors" />
                  </div>
                )}

                {/* === RESET: show email as readonly + code field === */}
                {mode === "reset" && email && (
                  <>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="email" value={email} readOnly className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm bg-background-alt text-text-muted" />
                    </div>
                    <div className="relative">
                      <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder={lang === "en" ? "Reset code" : "রিসেট কোড"} required className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors" />
                    </div>
                  </>
                )}

                {/* === REGISTER: phone field === */}
                {mode === "register" && (
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={lang === "en" ? "Phone number (optional)" : "ফোন নম্বর (ঐচ্ছিক)"} className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors" />
                  </div>
                )}

                {/* === PASSWORD — login, register, reset === */}
                {mode !== "forgot" && (
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "reset" ? (lang === "en" ? "New password" : "নতুন পাসওয়ার্ড") : (lang === "en" ? "Password" : "পাসওয়ার্ড")} required className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors" />
                  </div>
                )}

                {/* === CONFIRM PASSWORD — register, reset === */}
                {(mode === "register" || mode === "reset") && (
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder={lang === "en" ? "Confirm password" : "পাসওয়ার্ড নিশ্চিত করুন"} required className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors" />
                  </div>
                )}

                {/* === FORGOT PASSWORD LINK — login only === */}
                {mode === "login" && (
                  <div className="text-right">
                    <button type="button" onClick={() => switchMode("forgot")} className="text-sm text-primary hover:text-primary-dark transition-colors font-medium">
                      {lang === "en" ? "Forgot password?" : "পাসওয়ার্ড ভুলে গেছেন?"}
                    </button>
                  </div>
                )}

                {/* === SUBMIT BUTTON === */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? (lang === "en" ? "Please wait..." : "অপেক্ষা করুন...")
                    : (lang === "en"
                        ? { login: "Login", register: "Register", forgot: "Send Reset Code", reset: "Reset Password" }
                        : { login: "লগইন করুন", register: "রেজিস্টার করুন", forgot: "রিসেট কোড পাঠান", reset: "পাসওয়ার্ড রিসেট করুন" })[mode]}
                </button>

                {/* === BACK TO LOGIN — forgot/reset only === */}
                {(mode === "forgot" || mode === "reset") && (
                  <button type="button" onClick={() => switchMode("login")} className="w-full py-2 text-sm text-text-muted hover:text-foreground transition-colors text-center">
                    ← {lang === "en" ? "Back to login" : "লগইনে ফিরে যান"}
                  </button>
                )}
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
