/**
 * Browser-side face detection + embedding (ONNX Runtime Web, CPU/WASM).
 *
 *   camera frame -> YuNet detector (box + 5 landmarks)
 *                -> quality gate -> 5-point alignment to 112x112
 *                -> SFace (MobileFaceNet) -> 128-d L2-normalised embedding
 *
 * Models (both from the OpenCV Zoo, licences MIT / Apache-2.0), served from /public:
 *   public/models/face_detection_yunet_2026may.onnx
 *   public/models/face_recognition_sface_2021dec_int8.onnx
 *   public/ort/ort-wasm-simd-threaded.wasm   (must match the onnxruntime-web version)
 *
 * The models are downloaded once, cached (Cache Storage) and kept in memory.
 * Only the embedding is sent to the server - never the image.
 */
import * as ort from "onnxruntime-web/wasm";

// Must equal EMBEDDING_MODEL in the Flask backend config. Change both if the model changes.
export const EMBEDDING_MODEL = "sface-yunet-v1";
export const EMBEDDING_DIM = 128;
export const ORT_VERSION = "1.31.1";

const BASE = import.meta.env.BASE_URL || "/";
const DETECTOR_URL = `${BASE}models/face_detection_yunet_2026may.onnx`;
const RECOGNIZER_URL = `${BASE}models/face_recognition_sface_2021dec_int8.onnx`;
const CACHE_NAME = "face-models-v1";

// Tunable limits (pixels refer to the camera frame).
export const FACE_LIMITS = {
  detectMaxSide: 640, // frames are shrunk to this before detection
  scoreThreshold: 0.8,
  nmsThreshold: 0.3,
  minFaceSize: 80, // smaller faces are rejected as "too far away"
  countFacesFrom: 40, // detections narrower than this are ignored when counting faces
  edgeMargin: 0.01, // fraction of the frame
  dominanceRatio: 1.6, // recognition: largest face must be this much wider than the next
  brightnessMin: 30,
  brightnessMax: 235,
  blurMin: 25, // variance of the Laplacian of the aligned 112x112 crop
};

// ArcFace 112x112 template: [right eye, left eye, nose, right mouth, left mouth] (image-left first).
const TEMPLATE = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];

/** A problem with the camera image that is safe to show to the user. */
export class FaceIssue extends Error {
  constructor(message) {
    super(message);
    this.name = "FaceIssue";
  }
}

// ---------------------------------------------------------------------------
// Model loading (once)
// ---------------------------------------------------------------------------
let enginePromise = null;
let engineReady = false;

export function isFaceEngineReady() {
  return engineReady;
}

async function fetchModelBytes(url, onProgress, label) {
  let cache = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return { bytes: new Uint8Array(await hit.arrayBuffer()), cache, fromCache: true };
  } catch {
    cache = null; // Cache Storage unavailable (private mode, http): just use the network
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} could not be downloaded (HTTP ${response.status})`);
  const total = Number(response.headers.get("content-length")) || 0;

  let bytes;
  if (response.body && total) {
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress?.(Math.min(1, received / total));
    }
    bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
  } else {
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  onProgress?.(1);
  return { bytes, cache, fromCache: false };
}

async function createSession(url, label, onProgress) {
  const options = { executionProviders: ["wasm"], graphOptimizationLevel: "all", logSeverityLevel: 3 };
  let { bytes, cache, fromCache } = await fetchModelBytes(url, onProgress, label);
  try {
    const session = await ort.InferenceSession.create(bytes, options);
    if (!fromCache && cache) {
      try {
        await cache.put(url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } }));
      } catch {
        /* caching is optional */
      }
    }
    return session;
  } catch (err) {
    if (fromCache && cache) {
      // A bad cached copy: drop it and download again once.
      await cache.delete(url).catch(() => {});
      return createSession(url, label, onProgress);
    }
    throw new Error(`${label} is missing or corrupt. Check the files in /models. (${err?.message || err})`);
  }
}

/**
 * Download and initialise both models. Safe to call many times: the work
 * happens once and every caller gets the same promise. `onProgress(0..1)` is
 * reported for the first caller only while loading.
 */
export function loadFaceEngine({ onProgress } = {}) {
  if (!enginePromise) {
    ort.env.wasm.wasmPaths = `${BASE}ort/`;
    ort.env.wasm.numThreads = 1; // multi-threading needs cross-origin isolation headers
    ort.env.logLevel = "error";

    const weights = [0.1, 0.9]; // the detector is tiny, the recogniser is most of the download
    let detectorShare = 0;
    let recognizerShare = 0;
    const report = () => onProgress?.(weights[0] * detectorShare + weights[1] * recognizerShare);

    enginePromise = (async () => {
      const detector = await createSession(DETECTOR_URL, "Face detector", (p) => {
        detectorShare = p;
        report();
      });
      const recognizer = await createSession(RECOGNIZER_URL, "Face recognition model", (p) => {
        recognizerShare = p;
        report();
      });
      engineReady = true;
      return { detector, recognizer };
    })().catch((err) => {
      enginePromise = null; // allow a retry
      throw err;
    });
  }
  return enginePromise;
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------
function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
const detectCanvas = makeCanvas(32, 32);
const alignCanvas = makeCanvas(112, 112);

function context(canvas) {
  return canvas.getContext("2d", { willReadFrequently: true });
}

function sourceSize(source) {
  if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight, ready: source.readyState >= 2 };
  }
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  return { width, height, ready: width > 0 && height > 0 };
}

// ---------------------------------------------------------------------------
// Detection (YuNet)
// ---------------------------------------------------------------------------
function iou(a, b) {
  const x1 = Math.max(a.box.x, b.box.x);
  const y1 = Math.max(a.box.y, b.box.y);
  const x2 = Math.min(a.box.x + a.box.w, b.box.x + b.box.w);
  const y2 = Math.min(a.box.y + a.box.h, b.box.y + b.box.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.box.w * a.box.h + b.box.w * b.box.h - inter;
  return union > 0 ? inter / union : 0;
}

async function detectFaces(session, source, width, height) {
  const scale = Math.min(1, FACE_LIMITS.detectMaxSide / Math.max(width, height));
  const drawW = Math.max(1, Math.round(width * scale));
  const drawH = Math.max(1, Math.round(height * scale));
  // YuNet needs sizes that are multiples of 32: pad (do not stretch) to keep the aspect ratio.
  const padW = Math.ceil(drawW / 32) * 32;
  const padH = Math.ceil(drawH / 32) * 32;

  detectCanvas.width = padW;
  detectCanvas.height = padH;
  const ctx = context(detectCanvas);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, padW, padH);
  ctx.drawImage(source, 0, 0, drawW, drawH);
  const { data } = ctx.getImageData(0, 0, padW, padH);

  // BGR, 0..255, NCHW (what OpenCV's FaceDetectorYN feeds the network)
  const plane = padW * padH;
  const input = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i += 1) {
    input[i] = data[i * 4 + 2];
    input[plane + i] = data[i * 4 + 1];
    input[2 * plane + i] = data[i * 4];
  }
  const out = await session.run({
    [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, padH, padW]),
  });

  const candidates = [];
  [8, 16, 32].forEach((stride, level) => {
    const cols = padW / stride;
    const rows = padH / stride;
    const cls = out[`cls_${stride}`].data;
    const obj = out[`obj_${stride}`].data;
    const bbox = out[`bbox_${stride}`].data;
    const kps = out[`kps_${stride}`].data;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const idx = r * cols + c;
        const clsScore = Math.min(Math.max(cls[idx], 0), 1);
        const objScore = Math.min(Math.max(obj[idx], 0), 1);
        const score = Math.sqrt(clsScore * objScore);
        if (score < FACE_LIMITS.scoreThreshold) continue;

        const cx = (c + bbox[idx * 4]) * stride;
        const cy = (r + bbox[idx * 4 + 1]) * stride;
        const w = Math.exp(bbox[idx * 4 + 2]) * stride;
        const h = Math.exp(bbox[idx * 4 + 3]) * stride;
        const landmarks = [];
        for (let n = 0; n < 5; n += 1) {
          landmarks.push([
            ((kps[idx * 10 + 2 * n] + c) * stride) / scale,
            ((kps[idx * 10 + 2 * n + 1] + r) * stride) / scale,
          ]);
        }
        candidates.push({
          score,
          level,
          box: { x: (cx - w / 2) / scale, y: (cy - h / 2) / scale, w: w / scale, h: h / scale },
          landmarks,
        });
      }
    }
  });

  // Non-maximum suppression
  candidates.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const candidate of candidates) {
    if (kept.length >= 20) break;
    if (kept.every((other) => iou(candidate, other) <= FACE_LIMITS.nmsThreshold)) kept.push(candidate);
  }
  return kept;
}

function selectFace(faces, policy) {
  if (!faces.length) throw new FaceIssue("No face detected");
  const sorted = [...faces].sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h);
  const counted = sorted.filter((face) => face.box.w >= FACE_LIMITS.countFacesFrom);
  if (counted.length === 0) throw new FaceIssue("Face is too small. Move closer to the camera");
  if (counted.length > 1) {
    if (policy === "single") throw new FaceIssue("More than one face detected");
    if (counted[0].box.w < FACE_LIMITS.dominanceRatio * counted[1].box.w) {
      throw new FaceIssue("More than one face in view. One student at a time, please");
    }
  }
  return counted[0];
}

function checkGeometry(face, width, height) {
  const { x, y, w, h } = face.box;
  if (Math.min(w, h) < FACE_LIMITS.minFaceSize) {
    throw new FaceIssue("Face is too small. Move closer to the camera");
  }
  const margin = FACE_LIMITS.edgeMargin * Math.min(width, height);
  if (x < margin || y < margin || x + w > width - margin || y + h > height - margin) {
    throw new FaceIssue("Face is too close to the edge of the frame");
  }
}

// ---------------------------------------------------------------------------
// Alignment (5 landmarks -> 112x112 template, similarity transform)
// ---------------------------------------------------------------------------
function similarityTransform(points) {
  // Least-squares rotation + uniform scale + translation mapping `points` onto TEMPLATE.
  const n = points.length;
  const pc = [0, 0];
  const qc = [0, 0];
  for (let i = 0; i < n; i += 1) {
    pc[0] += points[i][0] / n;
    pc[1] += points[i][1] / n;
    qc[0] += TEMPLATE[i][0] / n;
    qc[1] += TEMPLATE[i][1] / n;
  }
  let dot = 0;
  let cross = 0;
  let norm = 0;
  for (let i = 0; i < n; i += 1) {
    const px = points[i][0] - pc[0];
    const py = points[i][1] - pc[1];
    const qx = TEMPLATE[i][0] - qc[0];
    const qy = TEMPLATE[i][1] - qc[1];
    dot += px * qx + py * qy;
    cross += px * qy - py * qx;
    norm += px * px + py * py;
  }
  if (norm < 1e-6) throw new FaceIssue("Face could not be aligned. Try again");
  const a = dot / norm;
  const b = cross / norm;
  return { a, b, tx: qc[0] - (a * pc[0] - b * pc[1]), ty: qc[1] - (b * pc[0] + a * pc[1]) };
}

function alignFace(source, width, height, landmarks) {
  const { a, b, tx, ty } = similarityTransform(landmarks);
  const ctx = context(alignCanvas);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 112, 112);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(a, b, -b, a, tx, ty); // x' = a*x - b*y + tx ; y' = b*x + a*y + ty
  ctx.drawImage(source, 0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return ctx.getImageData(0, 0, 112, 112);
}

function checkQuality(image) {
  const { data } = image;
  const size = 112;
  const gray = new Float32Array(size * size);
  let sum = 0;
  for (let i = 0; i < gray.length; i += 1) {
    const value = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = value;
    sum += value;
  }
  const brightness = sum / gray.length;
  if (brightness < FACE_LIMITS.brightnessMin || brightness > FACE_LIMITS.brightnessMax) {
    throw new FaceIssue("Lighting is poor. Face the light and try again");
  }
  // Variance of the 4-neighbour Laplacian = sharpness
  let mean = 0;
  let meanSq = 0;
  let count = 0;
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = y * size + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - size] + gray[i + size] - 4 * gray[i];
      mean += lap;
      meanSq += lap * lap;
      count += 1;
    }
  }
  mean /= count;
  const variance = meanSq / count - mean * mean;
  if (variance < FACE_LIMITS.blurMin) {
    throw new FaceIssue("Image is too blurry. Hold still and try again");
  }
  return { brightness, sharpness: variance };
}

// ---------------------------------------------------------------------------
// Embedding (SFace)
// ---------------------------------------------------------------------------
async function runRecognizer(session, image) {
  // RGB, 0..255, NCHW (OpenCV: blobFromImage(scale 1, mean 0, swapRB))
  const plane = 112 * 112;
  const input = new Float32Array(3 * plane);
  const { data } = image;
  for (let i = 0; i < plane; i += 1) {
    input[i] = data[i * 4];
    input[plane + i] = data[i * 4 + 1];
    input[2 * plane + i] = data[i * 4 + 2];
  }
  const out = await session.run({
    [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, 112, 112]),
  });
  const raw = out[session.outputNames[0]].data;
  if (raw.length !== EMBEDDING_DIM) throw new Error("Unexpected face model output");

  let norm = 0;
  for (let i = 0; i < raw.length; i += 1) norm += raw[i] * raw[i];
  norm = Math.sqrt(norm);
  if (!Number.isFinite(norm) || norm < 1e-8) throw new FaceIssue("Face could not be analysed. Try again");
  // Plain numbers rounded to 6 decimals: small JSON payload, same precision as float32 needs.
  return Array.from(raw, (value) => Math.round((value / norm) * 1e6) / 1e6);
}

// ONNX sessions must not run concurrently: queue the work.
let queue = Promise.resolve();
function exclusive(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

/**
 * Detect one face in `source` (video, canvas or image) and return its embedding.
 *
 * policy "single"   - exactly one face must be visible (registration)
 * policy "dominant" - use the largest face, reject if two are similar in size (attendance)
 *
 * Throws FaceIssue (safe to show to the user) when the frame is not usable.
 * Returns { embedding: number[128], box, score, quality }.
 */
export async function embedFace(source, { policy = "single" } = {}) {
  const { detector, recognizer } = await loadFaceEngine();
  return exclusive(async () => {
    const { width, height, ready } = sourceSize(source);
    if (!ready) throw new FaceIssue("Camera is not ready yet");

    const faces = await detectFaces(detector, source, width, height);
    const face = selectFace(faces, policy);
    checkGeometry(face, width, height);

    const aligned = alignFace(source, width, height, face.landmarks);
    const quality = checkQuality(aligned);
    const embedding = await runRecognizer(recognizer, aligned);
    return { embedding, box: face.box, score: face.score, quality };
  });
}

/** Test/diagnostic helper: the raw detections, without any quality rules. */
export async function detectOnly(source) {
  const { detector } = await loadFaceEngine();
  return exclusive(async () => {
    const { width, height } = sourceSize(source);
    return detectFaces(detector, source, width, height);
  });
}

/** Test/diagnostic helper: embedding with NO quality gate, for calibration. */
export async function embedUnchecked(source, { policy = "dominant" } = {}) {
  const { detector, recognizer } = await loadFaceEngine();
  return exclusive(async () => {
    const { width, height } = sourceSize(source);
    const faces = await detectFaces(detector, source, width, height);
    if (!faces.length) throw new FaceIssue("No face detected");
    const sorted = [...faces].sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h);
    const face = policy === "dominant" ? sorted[0] : selectFace(faces, policy);
    const aligned = alignFace(source, width, height, face.landmarks);
    let quality = null;
    try {
      quality = checkQuality(aligned);
    } catch (err) {
      quality = { rejected: err.message };
    }
    return { embedding: await runRecognizer(recognizer, aligned), box: face.box, score: face.score, quality, faces: faces.length };
  });
}
