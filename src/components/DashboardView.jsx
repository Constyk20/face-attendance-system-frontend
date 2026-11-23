import { useState } from "react";
import { Link } from "react-router-dom";
import AttendanceChart from "./AttendanceChart";
import Icon from "./Icon";
import SessionDetailModal from "./SessionDetailModal";
import { ChartSkeleton, ListSkeleton, Skeleton, StatCardSkeleton, TableSkeleton } from "./Skeleton";
import { Alert, Button, Card, EmptyState, StatusBadge } from "./ui";
import useFetch from "../hooks/useFetch";
import {
  getAttendanceSessions,
  getDashboard,
  getDatabaseHealth,
  getHealth,
} from "../services/api";
import { firstName, formatDateTime, formatLongDate, getStoredUser, weekdayLabel } from "../utils/format";

const STAT_STYLES = {
  blue: "bg-blue-600",
  green: "bg-emerald-500",
  purple: "bg-violet-600",
  orange: "bg-orange-500",
};

function StatCard({ color, icon, label, value }) {
  return (
    <div className={`flex items-center gap-4 rounded-xl p-5 text-white shadow-sm ${STAT_STYLES[color]}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-white/90">{label}</p>
        <p className="text-3xl font-bold leading-tight">{value ?? 0}</p>
      </div>
    </div>
  );
}

const QUICK_ACTION_STYLES = {
  blue: "bg-blue-600 hover:bg-blue-700",
  green: "bg-emerald-500 hover:bg-emerald-600",
  purple: "bg-violet-600 hover:bg-violet-700",
  teal: "bg-teal-600 hover:bg-teal-700",
  orange: "bg-orange-500 hover:bg-orange-600",
  navy: "bg-blue-950 hover:bg-blue-900",
};

function QuickActions({ actions }) {
  return (
    <Card title="Quick Actions" icon="activity">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-center text-sm font-medium text-white transition ${QUICK_ACTION_STYLES[action.color]}`}
          >
            <Icon name={action.icon} className="h-6 w-6" />
            {action.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function StatusRow({ loading, ok, warn, label, detail }) {
  return (
    <div className="flex items-start gap-3">
      {loading ? (
        <Skeleton className="h-9 w-9 rounded-full" />
      ) : (
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
            ok ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-red-500"
          }`}
        >
          <Icon name={ok ? "check" : "alert"} className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        {loading ? (
          <>
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </>
        ) : (
          <>
            <p className="text-sm font-semibold leading-tight text-slate-800">{label}</p>
            <p className="text-xs text-slate-500">{detail}</p>
          </>
        )}
      </div>
    </div>
  );
}

const MODEL_LABELS = {
  browser: ["Runs in the browser", true, false],
  ready: ["Models loaded", true, false],
  loading: ["Loading models...", false, true],
  not_loaded: ["Models not loaded yet", false, true],
  error: ["Model failed to load", false, false],
};

function SystemStatus() {
  const api = useFetch(() => getHealth().then((response) => response.data), []);
  const db = useFetch(() => getDatabaseHealth().then((response) => response.data), []);

  const apiLoading = api.loading && !api.data;
  const dbLoading = db.loading && !db.data;
  const apiOk = !api.error && api.data?.status === "ok";
  const dbOk = !db.error && db.data?.status === "ok";
  const model = api.data?.model;
  const [modelText, modelOk, modelWarn] = MODEL_LABELS[model] || ["Unknown", false, true];
  const allGood = apiOk && dbOk && modelOk;

  return (
    <Card
      title="System Status"
      icon="activity"
      action={
        <button
          type="button"
          onClick={() => {
            api.reload();
            db.reload();
          }}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Refresh status"
        >
          <Icon name="refresh" className="h-4 w-4" />
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatusRow loading={dbLoading} ok={dbOk} label={dbOk ? "Database Connected" : "Database Offline"} detail="MongoDB" />
        <StatusRow
          loading={apiLoading}
          ok={apiOk && modelOk}
          warn={apiOk && modelWarn}
          label={modelOk ? "Face Recognition Ready" : "Face Recognition"}
          detail={apiOk ? modelText : "Unavailable"}
        />
        <StatusRow loading={apiLoading} ok={apiOk} label={apiOk ? "API Service Online" : "API Service Offline"} detail={apiOk ? "All systems good" : "Cannot reach server"} />
      </div>
      {api.data?.face_cache?.loaded ? (
        <p className="mt-4 text-xs text-slate-500">
          {api.data.face_cache.students} student(s) with registered faces ({api.data.face_cache.samples} samples)
        </p>
      ) : null}
      {!apiLoading && !dbLoading ? (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
            allGood ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          <Icon name={allGood ? "check-circle" : "alert"} className="h-5 w-5" />
          {allGood ? "System is running smoothly!" : "Some services need attention."}
        </div>
      ) : null}
    </Card>
  );
}

const ADMIN_STATS = (stats) => [
  { color: "blue", icon: "users", label: "Total Students", value: stats.total_students },
  { color: "green", icon: "user", label: "Total Lecturers", value: stats.total_lecturers },
  { color: "purple", icon: "book", label: "Total Courses", value: stats.total_courses },
  { color: "orange", icon: "check-circle", label: "Present Today", value: stats.present_today },
];

const LECTURER_STATS = (stats) => [
  { color: "blue", icon: "book", label: "Assigned Courses", value: stats.total_courses },
  { color: "green", icon: "play", label: "Active Sessions", value: stats.active_sessions },
  { color: "orange", icon: "check-circle", label: "Present Today", value: stats.present_today },
  { color: "purple", icon: "clock", label: "Total Sessions", value: stats.total_sessions },
];

const ADMIN_ACTIONS = [
  { to: "/admin/students", label: "Register Student", icon: "user-plus", color: "blue" },
  { to: "/admin/lecturers", label: "Manage Lecturers", icon: "user", color: "green" },
  { to: "/admin/courses", label: "Add Course", icon: "graduation", color: "purple" },
  { to: "/admin/faces", label: "Register Face", icon: "scan", color: "teal" },
  { to: "/admin/attendance", label: "Start Attendance", icon: "play", color: "orange" },
  { to: "/admin/reports", label: "View Reports", icon: "chart", color: "navy" },
];

const LECTURER_ACTIONS = [
  { to: "/lecturer/attendance", label: "Start Attendance", icon: "play", color: "orange" },
  { to: "/lecturer/reports", label: "View Reports", icon: "chart", color: "navy" },
  { to: "/lecturer/profile", label: "My Profile", icon: "user", color: "blue" },
];

export default function DashboardView({ role }) {
  const isAdmin = role === "admin";
  const user = getStoredUser();
  const [viewing, setViewing] = useState(null);

  const dashboard = useFetch(() => getDashboard().then((response) => response.data), []);
  const sessions = useFetch(
    () => getAttendanceSessions({ limit: 5 }).then((response) => response.data),
    []
  );

  const stats = dashboard.data?.stats;
  const weekly = (dashboard.data?.weekly || []).map((item) => ({
    label: weekdayLabel(item.date),
    value: item.present,
  }));
  const weekTotal = weekly.reduce((sum, item) => sum + item.value, 0);
  const recent = dashboard.data?.recent_activity || [];
  const sessionRows = sessions.data?.sessions || [];
  const statCards = stats ? (isAdmin ? ADMIN_STATS(stats) : LECTURER_STATS(stats)) : [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome, {isAdmin ? "Administrator" : firstName(user?.full_name) || "Lecturer"}!
          </h1>
          <p className="mt-1 text-slate-500">Here's what's happening with your attendance system today.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-sky-100 px-4 py-2 text-sm text-slate-700">
          <Icon name="calendar" className="h-4 w-4" />
          {formatLongDate()}
        </div>
      </div>

      <Alert onRetry={dashboard.reload}>{dashboard.error}</Alert>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats
          ? statCards.map((card) => <StatCard key={card.label} {...card} />)
          : Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card title="Attendance Overview" icon="chart" className="xl:col-span-3"
          action={<span className="text-xs text-slate-500">Students marked present, last 7 days</span>}>
          {dashboard.loading && !dashboard.data ? (
            <ChartSkeleton />
          ) : weekly.length ? (
            <>
              <AttendanceChart data={weekly} />
              {weekTotal === 0 ? (
                <p className="mt-2 text-center text-xs text-slate-500">No attendance marked in the last 7 days.</p>
              ) : null}
            </>
          ) : (
            <EmptyState icon="chart" title="No chart data yet" />
          )}
        </Card>
        <div className="xl:col-span-2">
          <QuickActions actions={isAdmin ? ADMIN_ACTIONS : LECTURER_ACTIONS} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card
          title="Recent Attendance Sessions"
          icon="clock"
          className="xl:col-span-3"
          action={
            <Link to={isAdmin ? "/admin/attendance" : "/lecturer/attendance"} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline">
              View All <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          }
        >
          <Alert onRetry={sessions.reload}>{sessions.error}</Alert>
          {sessions.loading && !sessions.data ? (
            <TableSkeleton rows={4} columns={5} />
          ) : sessionRows.length === 0 && !sessions.error ? (
            <EmptyState icon="clock" title="No attendance sessions yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Course</th>
                    <th className="px-3 py-2 font-semibold">Lecturer</th>
                    <th className="px-3 py-2 font-semibold">Date &amp; Time</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-800">{row.course_code || "-"}</td>
                      <td className="px-3 py-3">{row.lecturer_name || "-"}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDateTime(row.started_at)}</td>
                      <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-3 py-3">
                        <Button variant="secondary" className="px-3 py-1" onClick={() => setViewing(row)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats ? (
                <p className="mt-3 text-xs text-slate-500">
                  {stats.total_sessions} session(s) in total, {stats.active_sessions} active now
                </p>
              ) : null}
            </div>
          )}
        </Card>
        <div className="xl:col-span-2">
          <SystemStatus />
        </div>
      </div>

      <Card title="Recent Check-ins" icon="users">
        {dashboard.loading && !dashboard.data ? (
          <ListSkeleton rows={3} />
        ) : recent.length === 0 ? (
          <EmptyState icon="users" title="No attendance records yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Student</th>
                  <th className="px-2 py-2 font-medium">Matric</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Time</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{row.student_name}</td>
                    <td className="px-2 py-2">{row.matric_number}</td>
                    <td className="px-2 py-2">{row.date}</td>
                    <td className="px-2 py-2">{row.time}</td>
                    <td className="px-2 py-2"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {viewing ? <SessionDetailModal session={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
