import { useEffect, useState } from "react";
import { TableSkeleton } from "../components/Skeleton";
import { Alert, Button, Card, EmptyState, Field, PageHeader, Pagination, SelectField, StatusBadge } from "../components/ui";
import useFetch from "../hooks/useFetch";
import { exportAttendanceCsv, getAttendanceReport, getCourseReport, getCourses } from "../services/api";
import { errorMessage } from "../utils/format";

const PAGE_SIZE = 25;

export default function Reports() {
  const [courseId, setCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => setPage(1), [courseId, startDate, endDate]);

  const courses = useFetch(() => getCourses().then((response) => response.data.courses || []), []);

  const attendance = useFetch(() => {
    const params = { page, limit: PAGE_SIZE };
    if (courseId) params.course_id = courseId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return getAttendanceReport(params).then((response) => response.data);
  }, [courseId, startDate, endDate, page]);

  const courseReport = useFetch(() => getCourseReport(courseId).then((response) => response.data), [courseId], {
    enabled: Boolean(courseId),
  });

  async function handleExport() {
    setExportError("");
    setExporting(true);
    try {
      const params = {};
      if (courseId) params.course_id = courseId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await exportAttendanceCsv(params);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "attendance_report.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // With responseType "blob" the JSON error body arrives as a Blob.
      let text = errorMessage(err, "Could not export CSV");
      try {
        const body = err.response?.data;
        if (body instanceof Blob) text = JSON.parse(await body.text()).message || text;
      } catch {
        /* keep the generic message */
      }
      setExportError(text);
    } finally {
      setExporting(false);
    }
  }

  const records = attendance.data?.records || [];
  const report = courseId ? courseReport.data : null;
  const courseOptions = courses.data || [];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Attendance history, per-course summaries and CSV export." />

      <Alert>{exportError}</Alert>
      <Alert onRetry={courses.reload}>{courses.error}</Alert>

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
          <div className="md:col-span-2">
            <SelectField label="Course" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="">{courses.loading && !courses.data ? "Loading courses..." : "All visible courses"}</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_code} — {course.course_title}
                </option>
              ))}
            </SelectField>
          </div>
          <Field label="From" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} max={endDate || undefined} />
          <Field label="To" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate || undefined} />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button icon="download" onClick={handleExport} loading={exporting}>
            {exporting ? "Preparing..." : "Download CSV"}
          </Button>
          {startDate || endDate || courseId ? (
            <Button
              variant="secondary"
              onClick={() => {
                setCourseId("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </Card>

      {courseId ? (
        <Card className="mb-6" title={report ? `${report.course.course_code} — ${report.course.course_title}` : "Course summary"} icon="book">
          <Alert onRetry={courseReport.reload}>{courseReport.error}</Alert>
          {courseReport.loading && !report ? (
            <TableSkeleton rows={4} columns={4} />
          ) : report ? (
            <>
              <p className="mb-3 text-sm text-slate-500">
                {report.session_count} session(s), {report.total_present_marks} present mark(s)
              </p>
              {report.students.length === 0 ? (
                <EmptyState icon="users" title="No student has been marked for this course" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Student</th>
                        <th className="px-3 py-2 font-semibold">Matric</th>
                        <th className="px-3 py-2 font-semibold">Present</th>
                        <th className="px-3 py-2 font-semibold">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.students.map((student) => (
                        <tr key={student.student_id} className="border-b border-slate-100">
                          <td className="px-3 py-3">{student.student_name}</td>
                          <td className="px-3 py-3">{student.matric_number}</td>
                          <td className="px-3 py-3">
                            {student.present_count} / {student.session_count}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, student.percentage)}%` }} />
                              </div>
                              {student.percentage}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </Card>
      ) : null}

      <Card title="Attendance history" icon="clock">
        <Alert onRetry={attendance.reload}>{attendance.error}</Alert>
        {attendance.loading && !attendance.data ? (
          <TableSkeleton rows={6} columns={5} />
        ) : records.length === 0 && !attendance.error ? (
          <EmptyState icon="clock" title="No attendance records found" />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${attendance.loading ? "opacity-60" : ""}`}>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Student</th>
                  <th className="px-3 py-2 font-semibold">Matric</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-3 py-3">{row.student_name}</td>
                    <td className="px-3 py-3">{row.matric_number}</td>
                    <td className="px-3 py-3">{row.date}</td>
                    <td className="px-3 py-3">{row.time}</td>
                    <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={attendance.data?.page || page}
          pages={attendance.data?.pages || 1}
          total={attendance.data?.total || 0}
          limit={PAGE_SIZE}
          onPage={setPage}
          disabled={attendance.loading}
        />
      </Card>
    </div>
  );
}
