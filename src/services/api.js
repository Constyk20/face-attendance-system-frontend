import axios from "axios";

// Set VITE_API_URL in .env to point at another backend. Default: local Flask.
const baseURL = import.meta.env.VITE_API_URL || "https://face-attendance-system-backend.onrender.com/api";

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ----- Auth -----
export function login(email, password) {
  return api.post("/auth/login", { email, password });
}

export function getMe() {
  return api.get("/auth/me");
}

// ----- Health (no token needed) -----
export function getHealth() {
  return api.get("/health");
}

export function getDatabaseHealth() {
  return api.get("/health/db");
}

// ----- Dashboard / reports -----
export function getDashboard() {
  return api.get("/reports/dashboard");
}

export function getAttendanceReport(params = {}) {
  return api.get("/reports/attendance", { params });
}

export function getCourseReport(courseId) {
  return api.get(`/reports/course/${courseId}`);
}

export function getStudentReport(studentId) {
  return api.get(`/reports/student/${studentId}`);
}

export function exportAttendanceCsv(params = {}) {
  return api.get("/reports/export", {
    params,
    responseType: "blob",
  });
}

// ----- Students (list supports q, status, page, limit) -----
export function getStudents(params = {}) {
  return api.get("/students", { params });
}

export function createStudent(data) {
  return api.post("/students", data);
}

export function updateStudent(id, data) {
  return api.put(`/students/${id}`, data);
}

export function deactivateStudent(id) {
  return api.delete(`/students/${id}`);
}

// The browser computes the face embeddings; only numbers are sent, never photos.
export function registerFace(id, embeddings, model) {
  return api.post(`/students/${id}/register-face`, { embeddings, model }, { timeout: 60000 });
}

// ----- Courses and lecturers -----
export function getCourses() {
  return api.get("/courses");
}

export function createCourse(data) {
  return api.post("/courses", data);
}

export function getLecturers() {
  return api.get("/lecturers");
}

export function createLecturer(data) {
  return api.post("/lecturers", data);
}

// ----- Attendance -----
export function startAttendance(courseId) {
  return api.post("/attendance/start", { course_id: courseId });
}

export function endAttendance(sessionId) {
  return api.post("/attendance/end", { session_id: sessionId });
}

// `signal` lets the caller cancel an in-flight frame when the session ends.
export function recognizeFace(sessionId, embedding, model, signal) {
  return api.post(
    "/attendance/recognize",
    { session_id: sessionId, embedding, model },
    { signal, timeout: 20000 }
  );
}

export function getAttendanceSessions(params = {}) {
  return api.get("/attendance", { params });
}

export function getAttendanceSession(sessionId) {
  return api.get(`/attendance/${sessionId}`);
}

export default api;
