import { useCallback, useEffect, useRef, useState } from "react";
import SessionDetailModal from "../components/SessionDetailModal";
import WebcamCapture from "../components/WebcamCapture";
import { ListSkeleton, TableSkeleton } from "../components/Skeleton";
import { Alert, Button, Card, EmptyState, PageHeader, SelectField, StatusBadge } from "../components/ui";
import useFetch from "../hooks/useFetch";
import {
  endAttendance,
  getAttendanceSession,
  getAttendanceSessions,
  getCourses,
  recognizeFace,
  startAttendance,
} from "../services/api";
import { errorMessage, formatDateTime, isCanceled } from "../utils/format";

export default function Attendance() {
  const [courseId, setCourseId] = useState("");
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [statusText, setStatusText] = useState("Select a course and start a session.");
  const [lastMatch, setLastMatch] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [viewing, setViewing] = useState(null);

  const sessionRef = useRef(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const courses = useFetch(() => getCourses().then((response) => response.data.courses || []), []);
  const history = useFetch(
    () => getAttendanceSessions({ limit: 10 }).then((response) => response.data.sessions || []),
    []
  );

  const active = session?.status === "active";

  const loadRecords = useCallback(async (sessionId) => {
    setLoadingRecords(true);
    try {
      const { data } = await getAttendanceSession(sessionId);
      setRecords(data.records || []);
    } catch (err) {
      setError(errorMessage(err, "Could not load attendance records"));
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  async function handleStart() {
    setError("");
    if (!courseId) {
      setError("Select a course");
      return;
    }
    setStarting(true);
    try {
      const { data } = await startAttendance(courseId);
      setSession(data.session);
      setStatusText("Session started. Look at the camera.");
      await loadRecords(data.session.id);
      history.reload();
    } catch (err) {
      // The backend returns the running session with a 409: pick it up instead of failing.
      const existing = err.response?.status === 409 ? err.response.data?.session : null;
      if (existing && existing.status === "active") {
        setSession(existing);
        setStatusText("Resumed the session that was already running for this course.");
        await loadRecords(existing.id);
      } else {
        setError(errorMessage(err, "Could not start session"));
      }
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd() {
    if (!session) return;
    setEnding(true);
    setError("");
    try {
      const { data } = await endAttendance(session.id);
      setSession(data.session);
      setStatusText(`Session ended. ${records.length} student(s) marked present.`);
      setLastMatch(null);
      history.reload();
    } catch (err) {
      setError(errorMessage(err, "Could not end session"));
    } finally {
      setEnding(false);
    }
  }

  const addRecord = useCallback((record) => {
    if (!record) return;
    setRecords((current) => (current.some((row) => row.id === record.id) ? current : [...current, record]));
  }, []);

  // Called by the camera, one frame at a time.
  const handleFrame = useCallback(
    async (image, signal) => {
      const current = sessionRef.current;
      if (!current || current.status !== "active") return undefined;
      try {
        const { data } = await recognizeFace(current.id, image, signal);

        if (data.busy) {
          return { delayMs: 1500 }; // server is still busy: wait, do not overwrite the status
        }
        if (!data.recognized) {
          setStatusText(data.message || "Unknown face");
          setLastMatch(null);
          return undefined;
        }
        const name = data.student.full_name;
        const matric = data.student.matric_number;
        setLastMatch({ name, matric, duplicate: Boolean(data.duplicate) });
        setStatusText(
          data.duplicate ? `${name} (${matric}) is already marked present` : `${name} (${matric}) marked present`
        );
        addRecord(data.record);
        return { delayMs: data.duplicate ? 2500 : 2000 };
      } catch (err) {
        if (isCanceled(err)) return undefined;
        const status = err.response?.status;
        if (status === 409 || status === 404) {
          // Session ended or course deactivated elsewhere: stop scanning.
          setSession((existing) => (existing ? { ...existing, status: "ended" } : existing));
          setStatusText(errorMessage(err, "This session is no longer active"));
          history.reload();
          return undefined;
        }
        setStatusText(errorMessage(err, "Frame could not be processed"));
        return { delayMs: 3000 };
      }
    },
    [addRecord, history]
  );

  const courseOptions = courses.data || [];

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Start a session, then let students look at the camera one at a time." />

      <Alert>{error}</Alert>
      <Alert onRetry={courses.reload}>{courses.error}</Alert>

      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <SelectField
              label="Course"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              disabled={active || courses.loading}
            >
              <option value="">{courses.loading ? "Loading courses..." : "Select course"}</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_code} — {course.course_title}
                </option>
              ))}
            </SelectField>
          </div>
          {active ? (
            <Button variant="danger" onClick={handleEnd} loading={ending}>
              End session
            </Button>
          ) : (
            <Button icon="play" onClick={handleStart} loading={starting} disabled={courses.loading}>
              Start session
            </Button>
          )}
        </div>
        <p aria-live="polite" className="mt-3 text-sm text-slate-600">
          {statusText}
        </p>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Camera" icon="camera">
          {active ? (
            <WebcamCapture active={active} onFrame={handleFrame} />
          ) : (
            <EmptyState icon="camera" title="Camera is off">
              The camera starts when a session is active.
            </EmptyState>
          )}
          {lastMatch ? (
            <div
              className={`mt-4 flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
                lastMatch.duplicate ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              <span className="font-semibold">{lastMatch.name}</span>
              <span>{lastMatch.matric}</span>
              <span className="ml-auto">{lastMatch.duplicate ? "Already marked" : "Marked present"}</span>
            </div>
          ) : null}
        </Card>

        <Card title={`Present (${records.length})`} icon="users">
          {loadingRecords && records.length === 0 ? (
            <TableSkeleton rows={4} columns={3} />
          ) : records.length === 0 ? (
            <EmptyState icon="users" title="No student has been marked yet" />
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-white text-slate-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Matric</th>
                    <th className="px-2 py-2 font-medium">Time</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{row.student_name}</td>
                      <td className="px-2 py-2">{row.matric_number}</td>
                      <td className="px-2 py-2">{row.time}</td>
                      <td className="px-2 py-2"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Recent sessions" icon="clock">
        <Alert onRetry={history.reload}>{history.error}</Alert>
        {history.loading && !history.data ? (
          <ListSkeleton rows={3} />
        ) : (history.data || []).length === 0 ? (
          <EmptyState icon="clock" title="No sessions yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Course</th>
                  <th className="px-2 py-2 font-medium">Lecturer</th>
                  <th className="px-2 py-2 font-medium">Started</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {history.data.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium">{row.course_code || "-"}</td>
                    <td className="px-2 py-2">{row.lecturer_name || "-"}</td>
                    <td className="whitespace-nowrap px-2 py-2">{formatDateTime(row.started_at)}</td>
                    <td className="px-2 py-2"><StatusBadge status={row.status} /></td>
                    <td className="px-2 py-2">
                      <Button variant="secondary" className="px-3 py-1" onClick={() => setViewing(row)}>
                        View
                      </Button>
                    </td>
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
