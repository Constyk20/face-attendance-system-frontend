import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Alert, Button } from "../components/ui";
import { login } from "../services/api";
import { errorMessage, getStoredUser } from "../utils/format";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in: go straight to the dashboard.
  const existing = getStoredUser();
  if (existing && localStorage.getItem("token")) {
    return <Navigate to={existing.role === "admin" ? "/admin" : "/lecturer"} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await login(email.trim(), password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "admin" ? "/admin" : "/lecturer");
    } catch (err) {
      setError(errorMessage(err, "Login failed. Check email and password."));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-950 to-blue-600 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-950 text-amber-300">
            <Icon name="shield" className="h-8 w-8" strokeWidth={1.6} />
          </div>
          <h1 className="text-xl font-bold text-blue-950">University Attendance System</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in as administrator or lecturer</p>
        </div>

        <Alert>{error}</Alert>

        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="mb-6 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <Button type="submit" loading={loading} className="w-full py-2.5">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
