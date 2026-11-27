/* Deployment configuration.
   scormPlayerOrigin: origin that serves scorm-player.html + scorm-sw.js for SCORM previews.
   Production should use a separate origin (e.g. https://scorm-preview.example.edu) so package
   code cannot reach the Admin page, its storage or its session. Empty = same origin as the
   Admin (development fallback; the preview shows an isolation warning). */
window.LU_CONFIG = {
  scormPlayerOrigin: '',
};
