import { useEffect, useRef, useState } from "react";
import { Spinner } from "./ui";

/**
 * Live camera that hands the <video> element to `onFrame` ONE AT A TIME.
 *
 * The next frame is only processed after the previous call has finished (face
 * embedding in the browser plus the server request). `onFrame(video, signal)`
 * may return `{ delayMs }` to change the wait before the next frame.
 * Nothing is uploaded from here: the caller turns the frame into an embedding.
 */
export default function WebcamCapture({ active, onFrame, intervalMs = 1200, scanning = true }) {
  const videoRef = useRef(null);
  const onFrameRef = useRef(onFrame);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  // Camera on/off
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let stream = null;
    setReady(false);
    setCameraError("");

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
  }, [active]);

  // Sequential frame loop (never overlaps)
  useEffect(() => {
    if (!active || !ready || !scanning) return undefined;
    let stopped = false;
    let timer = null;
    const controller = new AbortController();

    async function tick() {
      if (stopped) return;
      let delay = intervalMs;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          const result = await onFrameRef.current(video, controller.signal);
          if (result?.delayMs) delay = result.delayMs;
        } catch {
          delay = 3000; // unexpected error: back off
        }
      }
      if (!stopped) timer = setTimeout(tick, delay);
    }

    timer = setTimeout(tick, 600);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort(); // cancel the request that is still in flight
    };
  }, [active, ready, scanning, intervalMs]);

  if (!active) return null;

  return (
    <div>
      {cameraError ? (
        <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {cameraError}
        </p>
      ) : null}
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl bg-slate-900">
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
        {ready ? (
          <>
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/40" />
            <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {scanning ? "Scanning" : "Paused"}
            </div>
          </>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Faces are analysed on this device; only numbers are sent to the server. This is not a full anti-spoofing check.
      </p>
    </div>
  );
}
