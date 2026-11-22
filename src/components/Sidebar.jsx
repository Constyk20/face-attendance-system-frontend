import { NavLink } from "react-router-dom";
import Icon from "./Icon";

const ADMIN_SECTIONS = [
  { links: [{ to: "/admin", label: "Dashboard", icon: "home", end: true }] },
  {
    title: "Management",
    links: [
      { to: "/admin/students", label: "Students", icon: "users" },
      { to: "/admin/lecturers", label: "Lecturers", icon: "user" },
      { to: "/admin/courses", label: "Courses", icon: "book" },
      { to: "/admin/faces", label: "Register Faces", icon: "scan" },
    ],
  },
  {
    title: "Attendance",
    links: [
      { to: "/admin/attendance", label: "View Attendance", icon: "clock" },
      { to: "/admin/reports", label: "Reports", icon: "chart" },
    ],
  },
  { title: "Settings", links: [{ to: "/admin/profile", label: "Profile", icon: "user" }] },
];

const LECTURER_SECTIONS = [
  { links: [{ to: "/lecturer", label: "Dashboard", icon: "home", end: true }] },
  {
    title: "Attendance",
    links: [
      { to: "/lecturer/attendance", label: "Attendance", icon: "clock" },
      { to: "/lecturer/reports", label: "Reports", icon: "chart" },
    ],
  },
  { title: "Settings", links: [{ to: "/lecturer/profile", label: "Profile", icon: "user" }] },
];

function Logo() {
  // Generic shield mark (not a real institution crest).
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-amber-300">
      <Icon name="shield" className="h-8 w-8" strokeWidth={1.6} />
    </div>
  );
}

export default function Sidebar({ role, open, onClose, onLogout }) {
  const sections = role === "admin" ? ADMIN_SECTIONS : LECTURER_SECTIONS;

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-blue-950 text-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col items-center gap-2 border-b border-white/10 px-5 py-6 text-center">
          <Logo />
          <div className="text-base font-bold leading-tight">
            University
            <br />
            Attendance System
          </div>
        </div>

        <nav className="mt-3 flex-1 px-3">
          {sections.map((section, index) => (
            <div key={index} className="mb-3">
              {section.title ? (
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                  {section.title}
                </p>
              ) : null}
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-blue-600 font-medium text-white"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon name={link.icon} className="h-5 w-5" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-blue-100 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" className="h-5 w-5" />
            Logout
          </button>
        </nav>

        <div className="m-4 rounded-xl border border-white/15 px-4 py-3 text-center text-xs text-blue-100">
          Face Recognition
          <br />
          Attendance System
          <br />
          <span className="text-blue-300">v1.0</span>
        </div>
      </aside>
    </>
  );
}
