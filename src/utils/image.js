let sharedCanvas = null;

/**
 * Draw the current video frame to a canvas no larger than `maxSide` on its
 * longest side and return a JPEG data URL (or null if the video is not ready).
 *
 * Small frames upload faster and the backend does not need more than ~640 px.
 */
export function captureFrame(video, { maxSide = 640, quality = 0.7 } = {}) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null;
  }
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);

  if (!sharedCanvas) sharedCanvas = document.createElement("canvas");
  sharedCanvas.width = width;
  sharedCanvas.height = height;
  sharedCanvas.getContext("2d").drawImage(video, 0, 0, width, height);
  return sharedCanvas.toDataURL("image/jpeg", quality);
}
