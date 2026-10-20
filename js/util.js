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

function resizeImageToDataUrl(file, maxDim, quality) {
  maxDim = maxDim || 1000;
  quality = quality || 0.75;
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onerror = function () { reject(new Error("Gagal membaca file gambar.")); };
    reader.onload = function () {
      const img = new Image();
      img.onerror = function () { reject(new Error("File yang dipilih bukan gambar yang valid.")); };
      img.onload = function () {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
