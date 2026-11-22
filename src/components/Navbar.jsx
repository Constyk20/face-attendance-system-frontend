import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { initials } from "../utils/format";

export default function Navbar({ user, onLogout, onMenu }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function close(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const base = user?.role === "admin" ? "/admin" : "/lecturer";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-sky-50 px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="rounded-md p-2 text-slate-600 hover:bg-sky-100 lg:hidden"
      >
        <Icon name="menu" className="h-6 w-6" />
      </button>
      <div className="hidden lg:block" />

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-sky-100"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-950 text-sm font-semibold text-white">
            {initials(user?.full_name)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold leading-tight text-slate-800">
              {user?.full_name || "User"}
            </span>
            <span className="block text-xs capitalize text-slate-500">{user?.role}</span>
          </span>
          <Icon name="chevron-down" className="h-4 w-4 text-slate-500" />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate(`${base}/profile`);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Icon name="user" className="h-4 w-4" /> Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <Icon name="logout" className="h-4 w-4" /> Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
