import { useState } from "react";
import { TableSkeleton } from "../components/Skeleton";
import { Alert, Badge, Button, Card, EmptyState, Field, PageHeader } from "../components/ui";
import useFetch from "../hooks/useFetch";
import { createLecturer, getLecturers } from "../services/api";
import { errorMessage } from "../utils/format";

const EMPTY = { full_name: "", email: "", password: "" };

export default function Lecturers() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const lecturers = useFetch(() => getLecturers().then((response) => response.data.lecturers || []), []);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (form.password.length < 8) {
      setError("Lecturer password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await createLecturer({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setForm(EMPTY);
      setMessage("Lecturer created");
      lecturers.reload();
    } catch (err) {
      setError(errorMessage(err, "Could not create lecturer"));
    } finally {
      setSaving(false);
    }
  }

  const rows = lecturers.data || [];

  return (
    <div>
      <PageHeader title="Lecturers" subtitle="Create lecturer accounts. Assign them to courses on the Courses page." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Add lecturer" icon="user-plus">
          <Alert>{error}</Alert>
          <Alert type="success">{message}</Alert>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Full name" name="full_name" value={form.full_name} onChange={onChange} required />
            <Field label="Email" name="email" type="email" value={form.email} onChange={onChange} required />
            <Field
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              hint="At least 8 characters"
              required
            />
            <Button type="submit" loading={saving}>
              {saving ? "Saving..." : "Create lecturer"}
            </Button>
          </form>
        </Card>

        <Card title="Lecturer list" icon="users" className="xl:col-span-2">
          <Alert onRetry={lecturers.reload}>{lecturers.error}</Alert>
          {lecturers.loading && !lecturers.data ? (
            <TableSkeleton rows={4} columns={3} />
          ) : rows.length === 0 && !lecturers.error ? (
            <EmptyState icon="user" title="No lecturers yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lecturer) => (
                    <tr key={lecturer.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-800">{lecturer.full_name}</td>
                      <td className="px-3 py-3">{lecturer.email}</td>
                      <td className="px-3 py-3">
                        <Badge color={lecturer.is_active ? "green" : "slate"}>
                          {lecturer.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
