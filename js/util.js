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

function pricelistOptionsHtml() {
  let html = '<option value="">— Pilih item dari pricelist —</option>';
  PRICELIST.forEach(function (group) {
    html += '<optgroup label="' + escapeHtml(group.category) + '">';
    group.items.forEach(function (it) {
      html +=
        '<option value="' + escapeHtml(it.name) + "|" + it.price + '">' +
        escapeHtml(it.name) + " — " + formatIDR(it.price) +
        "</option>";
    });
    html += "</optgroup>";
  });
  html += '<option value="__custom__">Item kustom (ketik manual)</option>';
  return html;
}
