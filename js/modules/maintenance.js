/* ===========================================================
   MODULE: Maintenance
   Jadwal perawatan peralatan/perlengkapan & pembayaran pajak.
   =========================================================== */

const MaintenanceModule = (function () {
  function render(container, ctx) {
    const db = loadDB();
    const canEdit = ctx.isAdmin;

    function statusPill(status) {
      const map = { "terjadwal": "pill-gold", "selesai": "pill-green", "belum dibayar": "pill-red", "lunas": "pill-green" };
      return '<span class="pill ' + (map[status] || "pill-grey") + '">' + escapeHtml(status) + "</span>";
    }

    function statCards() {
      const today = todayISO();
      const dueSoon = db.maintenance.filter((m) => m.dueDate <= today && m.status !== "selesai" && m.status !== "lunas").length;
      const perawatan = db.maintenance.filter((m) => m.type === "perawatan").length;
      const pajak = db.maintenance.filter((m) => m.type === "pajak").length;
      return (
        '<div class="grid grid-3">' +
        card("Perlu Ditindaklanjuti", String(dueSoon)) +
        card("Jadwal Perawatan", String(perawatan)) +
        card("Kewajiban Pajak", String(pajak)) +
        "</div>"
      );
    }
    function card(label, value) {
      return '<div class="card stat-card"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + escapeHtml(value) + "</div></div>";
    }

    function tableHtml() {
      const rows = db.maintenance.slice().sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
      if (!rows.length) return '<div class="table-wrap"><div class="empty-state">Belum ada jadwal perawatan / pajak.</div></div>';
      const trs = rows
        .map(function (m) {
          return (
            "<tr><td><strong>" + escapeHtml(m.itemName) + "</strong><br><span class=\"sans\" style=\"font-size:12px; color:var(--muted);\">" + escapeHtml(m.notes || "") + "</span></td>" +
            "<td>" + (m.type === "perawatan" ? '<span class="pill pill-grey">Perawatan</span>' : '<span class="pill pill-grey">Pajak</span>') + "</td>" +
            "<td>" + formatDate(m.dueDate) + "</td>" +
            "<td>" + formatIDR(m.cost) + "</td>" +
            "<td>" + statusPill(m.status) + "</td>" +
            "<td>" +
              (canEdit
                ? '<div class="row-actions"><button class="icon-btn" data-edit="' + m.id + '">Edit</button><button class="icon-btn danger" data-del="' + m.id + '">Hapus</button></div>'
                : '<span class="pill pill-grey">Lihat saja</span>') +
            "</td></tr>"
          );
        })
        .join("");
      return (
        '<div class="table-wrap"><table><thead><tr><th>Barang / Aset</th><th>Jenis</th><th>Jatuh Tempo</th><th>Biaya</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        trs +
        "</tbody></table></div>"
      );
    }

    function formHtml(existing) {
      const m = existing || { itemName: "", type: "perawatan", dueDate: todayISO(), cost: "", status: "terjadwal", notes: "" };
      return (
        "<h3>" + (existing ? "Edit Jadwal" : "Tambah Jadwal Perawatan / Pajak") + "</h3>" +
        '<p class="modal-sub">Catat perawatan berkala atau kewajiban pajak aset perusahaan.</p>' +
        '<form id="maintenanceForm"><div class="form-grid">' +
        '<div class="form-field full"><label>Nama Barang / Aset</label><input type="text" name="itemName" value="' + escapeHtml(m.itemName) + '" required></div>' +
        '<div class="form-field"><label>Jenis</label><select name="type">' +
          '<option value="perawatan"' + (m.type === "perawatan" ? " selected" : "") + '>Perawatan</option>' +
          '<option value="pajak"' + (m.type === "pajak" ? " selected" : "") + '>Pajak</option>' +
        "</select></div>" +
        '<div class="form-field"><label>Jatuh Tempo</label><input type="date" name="dueDate" value="' + escapeHtml(m.dueDate) + '" required></div>' +
        '<div class="form-field"><label>Biaya (Rp)</label><input type="number" min="0" name="cost" value="' + escapeHtml(m.cost) + '" required></div>' +
        '<div class="form-field"><label>Status</label><select name="status">' +
          ["terjadwal", "selesai", "belum dibayar", "lunas"].map((s) => '<option value="' + s + '"' + (m.status === s ? " selected" : "") + ">" + s + "</option>").join("") +
        "</select></div>" +
        '<div class="form-field full"><label>Catatan</label><input type="text" name="notes" value="' + escapeHtml(m.notes) + '"></div>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;">Simpan</button></div>' +
        "</form>"
      );
    }

    function openForm(existing) {
      openModal(formHtml(existing), function (modalEl) {
        modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
        modalEl.querySelector("#maintenanceForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.target).entries());
          if (existing) Object.assign(existing, data);
          else db.maintenance.push(Object.assign({ id: uid("mnt") }, data));
          saveDB(db);
          closeModal();
          renderAll();
        });
      });
    }

    function renderAll() {
      container.innerHTML =
        statCards() +
        '<div class="section-heading"><div><h2>Jadwal Perawatan & Pajak</h2><div class="sub">Perawatan peralatan/perlengkapan serta kewajiban pajak aset</div></div>' +
        (canEdit ? '<button class="btn btn-sm" style="width:auto;" id="addMaintenanceBtn">+ Tambah Jadwal</button>' : "") +
        "</div>" +
        tableHtml() +
        (canEdit ? "" : '<div class="readonly-banner" style="margin-top:18px;">Akun Anda bersifat lihat-saja untuk maintenance.</div>');

      const addBtn = container.querySelector("#addMaintenanceBtn");
      if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

      container.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () { openForm(db.maintenance.find((m) => m.id === btn.dataset.edit)); });
      });
      container.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirmAction("Hapus jadwal ini?")) return;
          db.maintenance = db.maintenance.filter((m) => m.id !== btn.dataset.del);
          saveDB(db);
          renderAll();
        });
      });
    }

    renderAll();
  }

  return { render: render };
})();
