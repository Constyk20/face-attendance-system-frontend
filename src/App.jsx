import { lazy, Suspense, useState } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/sidebar";
import { PageSkeleton } from "./components/Skeleton";
import Login from "./pages/Login";
import { getStoredUser } from "./utils/format";

// Pages load on demand, so the first screen downloads less code.
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LecturerDashboard = lazy(() => import("./pages/LecturerDashboard"));
const Students = lazy(() => import("./pages/Students"));
const Lecturers = lazy(() => import("./pages/Lecturers"));
const Courses = lazy(() => import("./pages/Courses"));
const Faces = lazy(() => import("./pages/Faces"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Reports = lazy(() => import("./pages/Reports"));
const Profile = lazy(() => import("./pages/Profile"));

function ProtectedLayout({ role }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getStoredUser();
  const token = localStorage.getItem("token");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/lecturer"} replace />;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar
        role={user.role}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={handleLogout}
      />
      <div className="min-h-screen lg:ml-64">
        <Navbar user={user} onLogout={handleLogout} onMenu={() => setMenuOpen(true)} />
        <main className="p-4 sm:p-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedLayout role="admin" />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<Students />} />
        <Route path="/admin/lecturers" element={<Lecturers />} />
        <Route path="/admin/courses" element={<Courses />} />
        <Route path="/admin/faces" element={<Faces />} />
        <Route path="/admin/attendance" element={<Attendance />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/profile" element={<Profile />} />
      </Route>

      <Route element={<ProtectedLayout role="lecturer" />}>
        <Route path="/lecturer" element={<LecturerDashboard />} />
        <Route path="/lecturer/attendance" element={<Attendance />} />
        <Route path="/lecturer/reports" element={<Reports />} />
        <Route path="/lecturer/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
