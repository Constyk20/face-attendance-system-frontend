import { useEffect, useRef, useState } from "react";
import FaceRegister from "../components/FaceRegister";
import { TableSkeleton } from "../components/Skeleton";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  SelectField,
} from "../components/ui";
import Icon from "../components/Icon";
import useDebounce from "../hooks/useDebounce";
import useFetch from "../hooks/useFetch";
import { createStudent, deactivateStudent, getStudents, updateStudent } from "../services/api";
import { errorMessage } from "../utils/format";

const EMPTY_FORM = {
  full_name: "",
  matric_number: "",
  department: "",
  faculty: "",
  level: "100",
  email: "",
};

const MATRIC_PATTERN = /^20[0-9]{2}\/[0-9]{6}\/reg$/;
const PAGE_SIZE = 20;

export default function Students() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState(null);
  const [faceStudent, setFaceStudent] = useState(null);
  const formRef = useRef(null);

  const search = useDebounce(query.trim(), 350);
  useEffect(() => setPage(1), [search, status]);

  const students = useFetch(
    () =>
      getStudents({ q: search, status, page, limit: PAGE_SIZE }).then((response) => response.data),
    [search, status, page]
  );

  const rows = students.data?.students || [];

  function onChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(student) {
    setEditingId(student.id);
    setForm({
      full_name: student.full_name,
      matric_number: student.matric_number,
      department: student.department,
      faculty: student.faculty,
      level: student.level,
      email: student.email || "",
    });
    setMessage("");
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const matric = form.matric_number.trim().toLowerCase();
    if (!MATRIC_PATTERN.test(matric)) {
      setError("Matriculation number must look like 2021/129965/reg");
      return;
    }

    const payload = {
      ...form,
      full_name: form.full_name.trim(),
      matric_number: matric,
      department: form.department.trim(),
      faculty: form.faculty.trim(),
      email: form.email.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateStudent(editingId, payload);
        setMessage("Student updated");
      } else {
        await createStudent(payload);
        setMessage("Student registered");
      }
      cancelEdit();
      students.reload();
    } catch (err) {
      setError(errorMessage(err, "Could not save student"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(student) {
    const confirmed = window.confirm(
      `Deactivate ${student.full_name}? They will no longer appear in active attendance.`
    );
    if (!confirmed) return;
    setError("");
    setMessage("");
    setRowBusy(student.id);
    try {
      await deactivateStudent(student.id);
      setMessage("Student deactivated");
      students.reload();
    } catch (err) {
      setError(errorMessage(err, "Could not deactivate student"));
    } finally {
      setRowBusy(null);
    }
  }

  async function handleReactivate(student) {
    setError("");
    setMessage("");
    setRowBusy(student.id);
    try {
      await updateStudent(student.id, { is_active: true });
      setMessage("Student reactivated");
      students.reload();
    } catch (err) {
      setError(errorMessage(err, "Could not reactivate student"));
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title="Students" subtitle="Register students, edit their details and enrol their faces." />

      <div ref={formRef} />
      <Card className="mb-6" title={editingId ? "Edit student" : "Register student"} icon="user-plus">
        <Alert>{error}</Alert>
        <Alert type="success">{message}</Alert>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Full name" name="full_name" value={form.full_name} onChange={onChange} required />
            <Field
              label="Matriculation number"
              name="matric_number"
              value={form.matric_number}
              onChange={onChange}
              placeholder="2021/129965/reg"
              required
            />
            <Field label="Department" name="department" value={form.department} onChange={onChange} required />
            <Field label="Faculty" name="faculty" value={form.faculty} onChange={onChange} required />
            <SelectField label="Level" name="level" value={form.level} onChange={onChange}>
              {["100", "200", "300", "400", "500"].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </SelectField>
            <Field label="Email (optional)" name="email" type="email" value={form.email} onChange={onChange} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" loading={saving}>
              {saving ? "Saving..." : editingId ? "Update student" : "Register student"}
            </Button>
            {editingId ? (
              <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card title="Student list" icon="users">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, matric, or department"
              aria-label="Search students"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>

        <Alert onRetry={students.reload}>{students.error}</Alert>

        {students.loading && !students.data ? (
          <TableSkeleton rows={6} columns={6} />
        ) : rows.length === 0 && !students.error ? (
          <EmptyState icon="users" title="No students found">
            {search ? "Try a different search." : "Register the first student above."}
          </EmptyState>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${students.loading ? "opacity-60" : ""}`}>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Matric</th>
                  <th className="px-3 py-2 font-semibold">Department</th>
                  <th className="px-3 py-2 font-semibold">Level</th>
                  <th className="px-3 py-2 font-semibold">Face</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-800">{student.full_name}</td>
                    <td className="px-3 py-3">{student.matric_number}</td>
                    <td className="px-3 py-3">{student.department}</td>
                    <td className="px-3 py-3">{student.level}</td>
                    <td className="px-3 py-3">
                      <Badge color={student.face_registered ? "green" : "amber"}>
                        {student.face_registered ? "Registered" : "Not yet"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Button variant="ghost" className="px-2 py-1" onClick={() => startEdit(student)} disabled={rowBusy === student.id}>
                        Edit
                      </Button>
                      {student.is_active ? (
                        <>
                          <Button variant="ghost" className="px-2 py-1" onClick={() => setFaceStudent(student)} disabled={rowBusy === student.id}>
                            Face
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-red-700 hover:bg-red-50"
                            onClick={() => handleDeactivate(student)}
                            loading={rowBusy === student.id}
                          >
                            Deactivate
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleReactivate(student)}
                          loading={rowBusy === student.id}
                        >
                          Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={students.data?.page || page}
          pages={students.data?.pages || 1}
          total={students.data?.total || 0}
          limit={PAGE_SIZE}
          onPage={setPage}
          disabled={students.loading}
        />
      </Card>

      {faceStudent ? (
        <Modal title={`Register face for ${faceStudent.full_name}`} onClose={() => setFaceStudent(null)}>
          <FaceRegister
            student={faceStudent}
            onDone={() => {
              setFaceStudent(null);
              setMessage("Face registered");
              students.reload();
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
