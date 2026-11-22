import { useState } from "react";
import { TableSkeleton } from "../components/Skeleton";
import { Alert, Button, Card, EmptyState, Field, PageHeader, SelectField } from "../components/ui";
import useFetch from "../hooks/useFetch";
import { createCourse, getCourses, getLecturers } from "../services/api";
import { errorMessage } from "../utils/format";

const EMPTY_COURSE = {
  course_code: "",
  course_title: "",
  department: "",
  level: "100",
  lecturer_id: "",
};

const CODE_PATTERN = /^[A-Za-z]{2,6}[0-9]{3}$/;

export default function Courses() {
  const [form, setForm] = useState(EMPTY_COURSE);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const lecturers = useFetch(() => getLecturers().then((response) => response.data.lecturers || []), []);
  const courses = useFetch(() => getCourses().then((response) => response.data.courses || []), []);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const code = form.course_code.replace(/\s/g, "").toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      setError("Course code must look like CSC401");
      return;
    }
    if (!form.lecturer_id) {
      setError("Select a lecturer");
      return;
    }

    setSaving(true);
    try {
      await createCourse({
        course_code: code,
        course_title: form.course_title.trim(),
        department: form.department.trim(),
        level: form.level,
        lecturer_id: form.lecturer_id,
      });
      setForm(EMPTY_COURSE);
      setMessage("Course created");
      courses.reload();
    } catch (err) {
      setError(errorMessage(err, "Could not create course"));
    } finally {
      setSaving(false);
    }
  }

  const rows = courses.data || [];
  const lecturerOptions = lecturers.data || [];

  return (
    <div>
      <PageHeader title="Courses" subtitle="Create courses and assign each one to a lecturer." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Add course" icon="graduation">
          <Alert>{error}</Alert>
          <Alert type="success">{message}</Alert>
          <Alert onRetry={lecturers.reload}>{lecturers.error}</Alert>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Course code" name="course_code" value={form.course_code} onChange={onChange} placeholder="CSC401" required />
            <Field label="Course title" name="course_title" value={form.course_title} onChange={onChange} required />
            <Field label="Department" name="department" value={form.department} onChange={onChange} required />
            <SelectField label="Level" name="level" value={form.level} onChange={onChange}>
              {["100", "200", "300", "400", "500"].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Assigned lecturer"
              name="lecturer_id"
              value={form.lecturer_id}
              onChange={onChange}
              required
              disabled={lecturers.loading && !lecturers.data}
            >
              <option value="">{lecturers.loading && !lecturers.data ? "Loading lecturers..." : "Select lecturer"}</option>
              {lecturerOptions.map((lecturer) => (
                <option key={lecturer.id} value={lecturer.id}>
                  {lecturer.full_name} ({lecturer.email})
                </option>
              ))}
            </SelectField>
            <Button type="submit" loading={saving}>
              {saving ? "Saving..." : "Create course"}
            </Button>
          </form>
        </Card>

        <Card title="Course list" icon="book" className="xl:col-span-2">
          <Alert onRetry={courses.reload}>{courses.error}</Alert>
          {courses.loading && !courses.data ? (
            <TableSkeleton rows={5} columns={5} />
          ) : rows.length === 0 && !courses.error ? (
            <EmptyState icon="book" title="No courses yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Code</th>
                    <th className="px-3 py-2 font-semibold">Title</th>
                    <th className="px-3 py-2 font-semibold">Department</th>
                    <th className="px-3 py-2 font-semibold">Level</th>
                    <th className="px-3 py-2 font-semibold">Lecturer</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((course) => (
                    <tr key={course.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-800">{course.course_code}</td>
                      <td className="px-3 py-3">{course.course_title}</td>
                      <td className="px-3 py-3">{course.department}</td>
                      <td className="px-3 py-3">{course.level}</td>
                      <td className="px-3 py-3">{course.lecturer?.full_name || "Unassigned"}</td>
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
