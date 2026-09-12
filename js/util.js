/* ===========================================================
   MIPO GROUP DASHBOARD — small UI utilities shared by modules
   =========================================================== */

function openModal(innerHtml, onMount) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "activeModal";
  backdrop.innerHTML = '<div class="modal">' + innerHtml + "</div>";
  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) closeModal();
  });
  document.body.appendChild(backdrop);
  if (typeof onMount === "function") onMount(backdrop);
  return backdrop;
}

function closeModal() {
  const existing = document.getElementById("activeModal");
  if (existing) existing.remove();
}

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function confirmAction(message) {
  return window.confirm(message);
}
