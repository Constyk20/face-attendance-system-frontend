import { useEffect, useRef, useState } from "react";
import { registerFace } from "../services/api";
import { Alert, Button, Spinner } from "./ui";
import { captureFrame } from "../utils/image";
import { errorMessage } from "../utils/format";

const MIN_IMAGES = 3;
const MAX_IMAGES = 5; // the backend accepts 3 to 8

const TIPS = [
  "Look straight at the camera",
  "Turn your head slightly",
  "Tilt your head a little",
  "Neutral expression",
  "Slight smile",
];

export default function FaceRegister({ student, onDone }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [images, setImages] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available. Open the app on localhost or over HTTPS.");
      return undefined;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      })
      .catch(() => {
        if (!cancelled) setCameraError("Camera permission was denied or no camera was found.");
      });
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    if (images.length >= MAX_IMAGES) return;
    const image = captureFrame(videoRef.current, { maxSide: 800, quality: 0.85 });
    if (!image) {
      setError("Camera is not ready yet");
      return;
    }
    setImages((current) => [...current, image]);
    setError("");
    setMessage("");
  }

  function remove(index) {
    setImages((current) => current.filter((_, position) => position !== index));
  }

  async function submit() {
    if (images.length < MIN_IMAGES) {
      setError(`Capture at least ${MIN_IMAGES} images first`);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("Checking and saving your photos. This can take a few seconds...");
    try {
      const { data } = await registerFace(student.id, images);
      setMessage(data.message || "Face registered");
      onDone();
    } catch (err) {
      setMessage("");
      setError(errorMessage(err, "Face registration failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        {student.full_name} ({student.matric_number}). Capture {MIN_IMAGES} to {MAX_IMAGES} clear photos of
        one face. Original photos are not stored. This does not fully prevent spoofing.
      </p>

      {cameraError ? <Alert>{cameraError}</Alert> : null}
      <Alert>{error}</Alert>
      <Alert type="info">{message}</Alert>

      <div className="relative mb-3 w-full max-w-xl overflow-hidden rounded-xl bg-slate-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          style={{ transform: "scaleX(-1)" }}
          className="aspect-[4/3] w-full object-cover"
        />
        {!ready && !cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 text-sm text-slate-300">
            <Spinner className="h-6 w-6" />
            Starting camera...
          </div>
        ) : null}
        {ready && images.length < MAX_IMAGES ? (
          <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            Next: {TIPS[images.length]}
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {images.map((image, index) => (
          <div key={index} className="relative">
            <img src={image} alt={`Capture ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={saving}
              aria-label={`Remove capture ${index + 1}`}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon="camera" onClick={capture} disabled={!ready || saving || images.length >= MAX_IMAGES}>
          Capture ({images.length}/{MAX_IMAGES})
        </Button>
        <Button variant="secondary" onClick={() => setImages([])} disabled={saving || images.length === 0}>
          Clear
        </Button>
        <Button onClick={submit} loading={saving} disabled={images.length < MIN_IMAGES}>
          {saving ? "Saving..." : "Save face"}
        </Button>
      </div>
    </div>
  );
}
