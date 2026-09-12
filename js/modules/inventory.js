/* ===========================================================
   MODULE: Inventory
   Peralatan & perlengkapan milik perusahaan.
   =========================================================== */

const InventoryModule = (function () {
  function render(container, ctx) {
    const db = loadDB();
    const canEdit = ctx.isAdmin;

    function conditionPill(c) {
      const map = { "Baik": "pill-green", "Perlu Servis": "pill-gold", "Rusak": "pill-red" };
      return '<span class="pill ' + (map[c] || "pill-grey") + '">' + escapeHtml(c) + "</span>";
    }

    function statCards() {
      const totalItems = db.inventory.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const needService = db.inventory.filter((i) => i.condition === "Perlu Servis").length;
      const damaged = db.inventory.filter((i) => i.condition === "Rusak").length;
      return (
        '<div class="grid grid-3">' +
        card("Jenis Barang", String(db.inventory.length)) +
        card("Total Unit", String(totalItems)) +
        card("Perlu Perhatian", String(needService + damaged)) +
        "</div>"
      );
    }
    function card(label, value) {
      return '<div class="card stat-card"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + escapeHtml(value) + "</div></div>";
    }

    function tableHtml() {
      const rows = db.inventory;
      if (!rows.length) return '<div class="table-wrap"><div class="empty-state">Belum ada data inventory.</div></div>';
      const trs = rows
        .map(function (i) {
          return (
            "<tr><td><strong>" + escapeHtml(i.name) + "</strong></td>" +
            "<td>" + escapeHtml(i.category) + "</td>" +
            "<td>" + escapeHtml(i.qty) + "</td>" +
            "<td>" + conditionPill(i.condition) + "</td>" +
            "<td>" + escapeHtml(i.location) + "</td>" +
            "<td>" +
              (canEdit
                ? '<div class="row-actions"><button class="icon-btn" data-edit="' + i.id + '">Edit</button><button class="icon-btn danger" data-del="' + i.id + '">Hapus</button></div>'
                : '<span class="pill pill-grey">Lihat saja</span>') +
            "</td></tr>"
          );
        })
        .join("");
      return (
        '<div class="table-wrap"><table><thead><tr><th>Nama Barang</th><th>Kategori</th><th>Jumlah</th><th>Kondisi</th><th>Lokasi</th><th>Aksi</th></tr></thead><tbody>' +
        trs +
        "</tbody></table></div>"
      );
    }

    function formHtml(existing) {
      const i = existing || { name: "", category: "", qty: 1, condition: "Baik", location: "" };
      return (
        "<h3>" + (existing ? "Edit Barang" : "Tambah Barang") + "</h3>" +
        '<p class="modal-sub">Catat peralatan atau perlengkapan milik perusahaan.</p>' +
        '<form id="inventoryForm"><div class="form-grid">' +
        '<div class="form-field full"><label>Nama Barang</label><input type="text" name="name" value="' + escapeHtml(i.name) + '" required></div>' +
        '<div class="form-field"><label>Kategori</label><input type="text" name="category" value="' + escapeHtml(i.category) + '" required placeholder="mis. Peralatan Saji"></div>' +
        '<div class="form-field"><label>Jumlah</label><input type="number" min="0" name="qty" value="' + escapeHtml(i.qty) + '" required></div>' +
        '<div class="form-field"><label>Kondisi</label><select name="condition">' +
          ["Baik", "Perlu Servis", "Rusak"].map((c) => '<option value="' + c + '"' + (i.condition === c ? " selected" : "") + ">" + c + "</option>").join("") +
        "</select></div>" +
        '<div class="form-field"><label>Lokasi</label><input type="text" name="location" value="' + escapeHtml(i.location) + '" required></div>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;">Simpan</button></div>' +
        "</form>"
      );
    }

    function openForm(existing) {
      openModal(formHtml(existing), function (modalEl) {
        modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
        modalEl.querySelector("#inventoryForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.target).entries());
          if (existing) Object.assign(existing, data);
          else db.inventory.push(Object.assign({ id: uid("ivt") }, data));
          saveDB(db);
          closeModal();
          renderAll();
        });
      });
    }

    function renderAll() {
      container.innerHTML =
        statCards() +
        '<div class="section-heading"><div><h2>Daftar Inventory</h2><div class="sub">Peralatan & perlengkapan perusahaan</div></div>' +
        (canEdit ? '<button class="btn btn-sm" style="width:auto;" id="addInventoryBtn">+ Tambah Barang</button>' : "") +
        "</div>" +
        tableHtml() +
        (canEdit ? "" : '<div class="readonly-banner" style="margin-top:18px;">Akun Anda bersifat lihat-saja untuk inventory.</div>');

      const addBtn = container.querySelector("#addInventoryBtn");
      if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

      container.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () { openForm(db.inventory.find((i) => i.id === btn.dataset.edit)); });
      });
      container.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirmAction("Hapus barang ini dari inventory?")) return;
          db.inventory = db.inventory.filter((i) => i.id !== btn.dataset.del);
          saveDB(db);
          renderAll();
        });
      });
    }

    renderAll();
  }

  return { render: render };
})();
