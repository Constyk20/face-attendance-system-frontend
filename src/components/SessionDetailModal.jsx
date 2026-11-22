import { getAttendanceSession } from "../services/api";
import useFetch from "../hooks/useFetch";
import { Alert, EmptyState, Modal, StatusBadge } from "./ui";
import { TableSkeleton } from "./Skeleton";
import { formatDateTime } from "../utils/format";

/** Shows who was marked present in one attendance session. */
export default function SessionDetailModal({ session, onClose }) {
  const { data, loading, error, reload } = useFetch(
    () => getAttendanceSession(session.id).then((response) => response.data),
    [session.id]
  );

  const records = data?.records || [];

  return (
    <Modal
      title={`${session.course_code || "Session"} · ${formatDateTime(session.started_at)}`}
      onClose={onClose}
      wide
    >
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
        <StatusBadge status={session.status} />
        {session.lecturer_name ? <span>Lecturer: {session.lecturer_name}</span> : null}
      </div>
      <Alert onRetry={reload}>{error}</Alert>
      {loading && !data ? (
        <TableSkeleton rows={4} columns={4} />
      ) : records.length === 0 && !error ? (
        <EmptyState icon="users" title="No student was marked in this session" />
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Matric</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{row.student_name}</td>
                  <td className="px-3 py-2">{row.matric_number}</td>
                  <td className="px-3 py-2">{row.time}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
