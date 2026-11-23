import { useEffect, useState } from "react";
import FaceRegister from "../components/FaceRegister";
import Icon from "../components/Icon";
import { TableSkeleton } from "../components/Skeleton";
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader, Pagination } from "../components/ui";
import useDebounce from "../hooks/useDebounce";
import useFetch from "../hooks/useFetch";
import { getStudents } from "../services/api";

const PAGE_SIZE = 20;

export default function Faces() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [faceStudent, setFaceStudent] = useState(null);
  const [message, setMessage] = useState("");

  const search = useDebounce(query.trim(), 350);
  useEffect(() => setPage(1), [search]);

  const students = useFetch(
    () => getStudents({ q: search, status: "active", page, limit: PAGE_SIZE }).then((response) => response.data),
    [search, page]
  );
  const rows = students.data?.students || [];

  return (
    <div>
      <PageHeader title="Register Faces" subtitle="Enrol or update the face of any active student." />
      <Alert type="success">{message}</Alert>

      <Card title="Active students" icon="scan">
        <div className="relative mb-4">
          <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, matric, or department"
            aria-label="Search students"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <Alert onRetry={students.reload}>{students.error}</Alert>

        {students.loading && !students.data ? (
          <TableSkeleton rows={6} columns={4} />
        ) : rows.length === 0 && !students.error ? (
          <EmptyState icon="users" title="No active students found" />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${students.loading ? "opacity-60" : ""}`}>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Matric</th>
                  <th className="px-3 py-2 font-semibold">Face</th>
                  <th className="px-3 py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {rows.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-800">{student.full_name}</td>
                    <td className="px-3 py-3">{student.matric_number}</td>
                    <td className="px-3 py-3">
                      <Badge color={student.face_registered ? "green" : "amber"}>
                        {student.face_status === "needs_reregistration"
                          ? "Re-register needed"
                          : student.face_registered
                            ? "Registered"
                            : "Not yet"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button variant="secondary" icon="camera" className="px-3 py-1" onClick={() => setFaceStudent(student)}>
                        {student.face_registered || student.face_status === "needs_reregistration" ? "Re-register" : "Register face"}
                      </Button>
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
