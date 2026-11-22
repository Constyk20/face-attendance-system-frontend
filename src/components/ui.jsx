import { useEffect } from "react";
import Icon from "./Icon";

export function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-blue-700 text-white hover:bg-blue-800 border border-transparent",
  secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300",
  danger: "bg-red-600 text-white hover:bg-red-700 border border-transparent",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent",
  ghost: "bg-transparent text-blue-700 hover:bg-blue-50 border border-transparent",
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Card({ children, className = "", title, action, icon }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            {icon ? <Icon name={icon} className="h-5 w-5 text-blue-600" /> : null}
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const ALERT_STYLES = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function Alert({ type = "error", children, onRetry }) {
  if (!children) return null;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`mb-4 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${ALERT_STYLES[type]}`}
    >
      <span>{children}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-medium underline">
          <Icon name="refresh" className="h-4 w-4" /> Retry
        </button>
      ) : null}
    </div>
  );
}

const BADGE_STYLES = {
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-100 text-slate-600",
};

export function Badge({ color = "slate", children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[color]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active: ["blue", "Active"],
    ended: ["green", "Completed"],
    present: ["green", "Present"],
  };
  const [color, label] = map[status] || ["slate", status || "-"];
  return <Badge color={color}>{label}</Badge>;
}

export function EmptyState({ icon = "activity", title, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children ? <p className="mt-1 text-sm text-slate-500">{children}</p> : null}
    </div>
  );
}

export function Pagination({ page, pages, total, limit, onPage, disabled = false }) {
  if (!total || pages <= 1) {
    return total ? <p className="mt-3 text-xs text-slate-500">{total} result(s)</p> : null;
  }
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-xs text-slate-500">
        Showing {from}-{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="px-3 py-1.5" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} icon="chevron-left">
          Prev
        </Button>
        <span className="text-sm text-slate-600">
          {page} / {pages}
        </span>
        <Button variant="secondary" className="px-3 py-1.5" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)}>
          Next
          <Icon name="chevron-right" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Field({ label, name, value, onChange, type = "text", required = false, placeholder, hint, ...rest }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        {...rest}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function SelectField({ label, children, ...props }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-700">{label}</span>
      <select
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-8 w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <Icon name="x" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
