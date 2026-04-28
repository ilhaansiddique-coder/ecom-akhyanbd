"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { theme } from "@/lib/theme";
import type { Bilingual } from "@/lib/bilingual";
import { FiSave } from "react-icons/fi";

export interface WelcomeTpl {
  subject: Bilingual;
  intro: Bilingual;
  button_text: Bilingual;
  button_url: string;
  closing: Bilingual;
  before_block: Bilingual;
  after_block: Bilingual;
}
export interface OrderConfirmationTpl {
  subject: Bilingual;
  heading: Bilingual;
  intro: Bilingual;
  closing: Bilingual;
  show_customer_info: boolean;
  show_items_table: boolean;
  show_totals: boolean;
  show_track_button: boolean;
  track_button_text: Bilingual;
  before_block: Bilingual;
  after_block: Bilingual;
}
export interface PasswordResetTpl {
  subject: Bilingual;
  heading: Bilingual;
  intro: Bilingual;
  footer: Bilingual;
  button_text: Bilingual;
  button_url: string;
  before_block: Bilingual;
  after_block: Bilingual;
}
export interface AdminOrderTpl {
  subject: Bilingual;
  heading: Bilingual;
  intro: Bilingual;
  show_customer_info: boolean;
  show_items_table: boolean;
  button_text: Bilingual;
  button_url: string;
  before_block: Bilingual;
  after_block: Bilingual;
}
export interface AdminContactTpl {
  subject: Bilingual;
  heading: Bilingual;
  intro: Bilingual;
  button_text: Bilingual;
  button_url: string;
  before_block: Bilingual;
  after_block: Bilingual;
}

export interface EmailTemplates {
  welcome: WelcomeTpl;
  order_confirmation: OrderConfirmationTpl;
  password_reset: PasswordResetTpl;
  admin_order_notification: AdminOrderTpl;
  admin_contact_notification: AdminContactTpl;
}

type TabKey = keyof EmailTemplates;

const TABS: { key: TabKey; label: string }[] = [
  { key: "welcome", label: "Welcome" },
  { key: "order_confirmation", label: "Order Confirmation" },
  { key: "password_reset", label: "Password Reset" },
  { key: "admin_order_notification", label: "Admin Order" },
  { key: "admin_contact_notification", label: "Admin Contact" },
];

const VARIABLES: Record<TabKey, string[]> = {
  welcome: ["site_name", "site_url"],
  order_confirmation: ["customer_name", "order_id", "total", "site_name", "site_url"],
  password_reset: ["site_name", "site_url"],
  admin_order_notification: ["order_id", "customer_name", "total", "site_name", "site_url"],
  admin_contact_notification: ["name", "site_name", "site_url"],
};

/** Side-by-side EN/BN single-line input pair. */
function BiInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Bilingual;
  onChange: (v: Bilingual) => void;
}) {
  return (
    <div>
      <label className={theme.label}>{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">English</label>
          <input
            value={value.en}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            className={theme.input}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">বাংলা</label>
          <input
            value={value.bn}
            onChange={(e) => onChange({ ...value, bn: e.target.value })}
            className={theme.input}
            dir="auto"
          />
        </div>
      </div>
    </div>
  );
}

/** Side-by-side EN/BN textarea pair. */
function BiTextarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: Bilingual;
  onChange: (v: Bilingual) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className={theme.label}>{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">English</label>
          <textarea
            value={value.en}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            className={theme.textarea}
            rows={rows}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">বাংলা</label>
          <textarea
            value={value.bn}
            onChange={(e) => onChange({ ...value, bn: e.target.value })}
            className={theme.textarea}
            rows={rows}
            dir="auto"
          />
        </div>
      </div>
    </div>
  );
}

/** Reusable card wrapper for grouping power-user fields. */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
      <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
      {children}
    </div>
  );
}

/** Plain single-line text input with label + helper. */
function PlainInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={theme.label}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={theme.input}
        placeholder={placeholder}
      />
    </div>
  );
}

/** Helper text style. */
const helperText = "text-xs text-gray-500";

export default function EmailTemplatesEditor({ initialData }: { initialData: EmailTemplates }) {
  const [content, setContent] = useState<EmailTemplates>(initialData);
  const [active, setActive] = useState<TabKey>("welcome");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      await api.admin.updateSettings({ email_templates: JSON.stringify(content) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* */
    }
    setSaving(false);
  };

  const copyVar = async (v: string) => {
    const literal = `{{${v}}}`;
    try {
      await navigator.clipboard.writeText(literal);
      setCopyMsg(`Copied ${literal}`);
      setTimeout(() => setCopyMsg(null), 1500);
    } catch {
      setCopyMsg("Copy failed");
      setTimeout(() => setCopyMsg(null), 1500);
    }
  };

  // Per-template field setter helpers
  const setWelcome = <K extends keyof WelcomeTpl>(k: K, v: WelcomeTpl[K]) =>
    setContent((p) => ({ ...p, welcome: { ...p.welcome, [k]: v } }));
  const setOrder = <K extends keyof OrderConfirmationTpl>(k: K, v: OrderConfirmationTpl[K]) =>
    setContent((p) => ({ ...p, order_confirmation: { ...p.order_confirmation, [k]: v } }));
  const setReset = <K extends keyof PasswordResetTpl>(k: K, v: PasswordResetTpl[K]) =>
    setContent((p) => ({ ...p, password_reset: { ...p.password_reset, [k]: v } }));
  const setAO = <K extends keyof AdminOrderTpl>(k: K, v: AdminOrderTpl[K]) =>
    setContent((p) => ({ ...p, admin_order_notification: { ...p.admin_order_notification, [k]: v } }));
  const setAC = <K extends keyof AdminContactTpl>(k: K, v: AdminContactTpl[K]) =>
    setContent((p) => ({ ...p, admin_contact_notification: { ...p.admin_contact_notification, [k]: v } }));

  const variables = VARIABLES[active];

  return (
    <DashboardLayout title="Email Templates">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Top save row */}
        <div className="flex justify-between items-center gap-3">
          <div className="text-xs text-gray-500">
            Customize subject lines and body text for transactional emails.
          </div>
          <button onClick={save} disabled={saving} className={theme.btn.primary + " flex items-center gap-2"}>
            <FiSave className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Variable hint chips */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-1">Available variables:</span>
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => copyVar(v)}
              className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-mono cursor-pointer hover:bg-primary/20"
              title="Click to copy"
            >
              {`{{${v}}}`}
            </button>
          ))}
          {copyMsg && <span className="text-xs text-gray-500 ml-2">{copyMsg}</span>}
        </div>

        {/* Tab content — base fields */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          {active === "welcome" && (
            <>
              <BiInput label="Subject" value={content.welcome.subject} onChange={(v) => setWelcome("subject", v)} />
              <BiTextarea label="Intro" value={content.welcome.intro} onChange={(v) => setWelcome("intro", v)} />
              <BiTextarea label="Closing" value={content.welcome.closing} onChange={(v) => setWelcome("closing", v)} />
            </>
          )}
          {active === "order_confirmation" && (
            <>
              <BiInput label="Subject" value={content.order_confirmation.subject} onChange={(v) => setOrder("subject", v)} />
              <BiInput label="Heading" value={content.order_confirmation.heading} onChange={(v) => setOrder("heading", v)} />
              <BiTextarea label="Intro" value={content.order_confirmation.intro} onChange={(v) => setOrder("intro", v)} />
              <BiTextarea label="Closing" value={content.order_confirmation.closing} onChange={(v) => setOrder("closing", v)} />
            </>
          )}
          {active === "password_reset" && (
            <>
              <BiInput label="Subject" value={content.password_reset.subject} onChange={(v) => setReset("subject", v)} />
              <BiInput label="Heading" value={content.password_reset.heading} onChange={(v) => setReset("heading", v)} />
              <BiTextarea label="Intro" value={content.password_reset.intro} onChange={(v) => setReset("intro", v)} />
              <BiTextarea label="Footer" value={content.password_reset.footer} onChange={(v) => setReset("footer", v)} />
            </>
          )}
          {active === "admin_order_notification" && (
            <>
              <BiInput label="Subject" value={content.admin_order_notification.subject} onChange={(v) => setAO("subject", v)} />
              <BiInput label="Heading" value={content.admin_order_notification.heading} onChange={(v) => setAO("heading", v)} />
              <BiTextarea label="Intro" value={content.admin_order_notification.intro} onChange={(v) => setAO("intro", v)} />
            </>
          )}
          {active === "admin_contact_notification" && (
            <>
              <BiInput label="Subject" value={content.admin_contact_notification.subject} onChange={(v) => setAC("subject", v)} />
              <BiInput label="Heading" value={content.admin_contact_notification.heading} onChange={(v) => setAC("heading", v)} />
              <BiTextarea label="Intro" value={content.admin_contact_notification.intro} onChange={(v) => setAC("intro", v)} />
            </>
          )}
        </div>

        {/* Section visibility — order_confirmation + admin_order_notification only */}
        {active === "order_confirmation" && (
          <Card title="Section Visibility">
            <p className={helperText}>Hide structural sections you don&apos;t want in this email.</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className={theme.checkbox}
                checked={content.order_confirmation.show_customer_info}
                onChange={(e) => setOrder("show_customer_info", e.target.checked)}
              />
              Show customer info (name, phone, address, city, payment)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className={theme.checkbox}
                checked={content.order_confirmation.show_items_table}
                onChange={(e) => setOrder("show_items_table", e.target.checked)}
              />
              Show items table
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className={theme.checkbox}
                checked={content.order_confirmation.show_totals}
                onChange={(e) => setOrder("show_totals", e.target.checked)}
              />
              Show subtotal / shipping / grand total
            </label>
          </Card>
        )}

        {active === "admin_order_notification" && (
          <Card title="Section Visibility">
            <p className={helperText}>Hide structural sections you don&apos;t want in this email.</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className={theme.checkbox}
                checked={content.admin_order_notification.show_customer_info}
                onChange={(e) => setAO("show_customer_info", e.target.checked)}
              />
              Show customer info
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className={theme.checkbox}
                checked={content.admin_order_notification.show_items_table}
                onChange={(e) => setAO("show_items_table", e.target.checked)}
              />
              Show items table + totals
            </label>
          </Card>
        )}

        {/* Track Order button — order_confirmation only */}
        {active === "order_confirmation" && (
          <Card title="Track Order Button">
            <p className={helperText}>
              Auto-links to <code className="font-mono">{`{{site_url}}/order/{{order_token}}`}</code>. Hidden when site URL is unset or the order has no token.
            </p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className={theme.checkbox}
                checked={content.order_confirmation.show_track_button}
                onChange={(e) => setOrder("show_track_button", e.target.checked)}
              />
              Show track order button
            </label>
            <BiInput
              label="Button Text"
              value={content.order_confirmation.track_button_text}
              onChange={(v) => setOrder("track_button_text", v)}
            />
          </Card>
        )}

        {/* Custom CTA Button — welcome, password_reset, admin_order_notification, admin_contact_notification */}
        {active === "welcome" && (
          <Card title="Custom CTA Button">
            <p className={helperText}>
              Leave both empty to omit. URL supports <code className="font-mono">{`{{site_url}}`}</code> variable.
            </p>
            <BiInput
              label="Button Text"
              value={content.welcome.button_text}
              onChange={(v) => setWelcome("button_text", v)}
            />
            <PlainInput
              label="URL"
              value={content.welcome.button_url}
              onChange={(v) => setWelcome("button_url", v)}
              placeholder="{{site_url}}/shop"
            />
          </Card>
        )}

        {active === "password_reset" && (
          <Card title="Custom CTA Button (optional)">
            <p className={helperText}>
              Leave both empty to omit. URL supports <code className="font-mono">{`{{site_url}}`}</code> variable.
            </p>
            <BiInput
              label="Button Text"
              value={content.password_reset.button_text}
              onChange={(v) => setReset("button_text", v)}
            />
            <PlainInput
              label="URL"
              value={content.password_reset.button_url}
              onChange={(v) => setReset("button_url", v)}
              placeholder="{{site_url}}/account"
            />
          </Card>
        )}

        {active === "admin_order_notification" && (
          <Card title="Custom CTA Button">
            <p className={helperText}>
              Leave both empty to omit. URL supports <code className="font-mono">{`{{site_url}}`}</code> variable.
            </p>
            <BiInput
              label="Button Text"
              value={content.admin_order_notification.button_text}
              onChange={(v) => setAO("button_text", v)}
            />
            <PlainInput
              label="URL"
              value={content.admin_order_notification.button_url}
              onChange={(v) => setAO("button_url", v)}
              placeholder="{{site_url}}/dashboard/orders"
            />
          </Card>
        )}

        {active === "admin_contact_notification" && (
          <Card title="Custom CTA Button">
            <p className={helperText}>
              Leave both empty to omit. URL supports <code className="font-mono">{`{{site_url}}`}</code> variable.
            </p>
            <BiInput
              label="Button Text"
              value={content.admin_contact_notification.button_text}
              onChange={(v) => setAC("button_text", v)}
            />
            <PlainInput
              label="URL"
              value={content.admin_contact_notification.button_url}
              onChange={(v) => setAC("button_url", v)}
              placeholder="{{site_url}}/dashboard/contacts"
            />
          </Card>
        )}

        {/* Custom Content Blocks — all 5 templates */}
        {active === "welcome" && (
          <Card title="Custom Content Blocks">
            <p className={helperText}>HTML allowed. Empty fields are skipped. Variables work here too.</p>
            <BiTextarea
              label="Before main content (HTML)"
              value={content.welcome.before_block}
              onChange={(v) => setWelcome("before_block", v)}
              rows={5}
            />
            <BiTextarea
              label="After main content (HTML)"
              value={content.welcome.after_block}
              onChange={(v) => setWelcome("after_block", v)}
              rows={5}
            />
          </Card>
        )}
        {active === "order_confirmation" && (
          <Card title="Custom Content Blocks">
            <p className={helperText}>HTML allowed. Empty fields are skipped. Variables work here too.</p>
            <BiTextarea
              label="Before main content (HTML)"
              value={content.order_confirmation.before_block}
              onChange={(v) => setOrder("before_block", v)}
              rows={5}
            />
            <BiTextarea
              label="After main content (HTML)"
              value={content.order_confirmation.after_block}
              onChange={(v) => setOrder("after_block", v)}
              rows={5}
            />
          </Card>
        )}
        {active === "password_reset" && (
          <Card title="Custom Content Blocks">
            <p className={helperText}>HTML allowed. Empty fields are skipped. Variables work here too.</p>
            <BiTextarea
              label="Before main content (HTML)"
              value={content.password_reset.before_block}
              onChange={(v) => setReset("before_block", v)}
              rows={5}
            />
            <BiTextarea
              label="After main content (HTML)"
              value={content.password_reset.after_block}
              onChange={(v) => setReset("after_block", v)}
              rows={5}
            />
          </Card>
        )}
        {active === "admin_order_notification" && (
          <Card title="Custom Content Blocks">
            <p className={helperText}>HTML allowed. Empty fields are skipped. Variables work here too.</p>
            <BiTextarea
              label="Before main content (HTML)"
              value={content.admin_order_notification.before_block}
              onChange={(v) => setAO("before_block", v)}
              rows={5}
            />
            <BiTextarea
              label="After main content (HTML)"
              value={content.admin_order_notification.after_block}
              onChange={(v) => setAO("after_block", v)}
              rows={5}
            />
          </Card>
        )}
        {active === "admin_contact_notification" && (
          <Card title="Custom Content Blocks">
            <p className={helperText}>HTML allowed. Empty fields are skipped. Variables work here too.</p>
            <BiTextarea
              label="Before main content (HTML)"
              value={content.admin_contact_notification.before_block}
              onChange={(v) => setAC("before_block", v)}
              rows={5}
            />
            <BiTextarea
              label="After main content (HTML)"
              value={content.admin_contact_notification.after_block}
              onChange={(v) => setAC("after_block", v)}
              rows={5}
            />
          </Card>
        )}

        {/* Bottom save */}
        <div className="flex justify-end pb-4">
          <button onClick={save} disabled={saving} className={theme.btn.primary + " flex items-center gap-2"}>
            <FiSave className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
