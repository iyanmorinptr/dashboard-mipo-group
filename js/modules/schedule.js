/* ===========================================================
   MODULE: Schedule
   Jadwal client, menu yang keluar, staff in charge, dsb.
   Input & edit hanya untuk role admin (yang memiliki akses).
   =========================================================== */

const ScheduleModule = (function () {
  function render(container, ctx) {
    const db = loadDB();
    const canEdit = ctx.isAdmin;

    let filterDate = "";

    function list() {
      let rows = db.schedules.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      if (filterDate) rows = rows.filter((r) => r.date === filterDate);
      return rows;
    }

    function statCards() {
      const today = todayISO();
      const todays = db.schedules.filter((s) => s.date === today);
      const upcoming = db.schedules.filter((s) => s.date > today);
      return (
        '<div class="grid grid-3">' +
        card("Jadwal Hari Ini", todays.length + " client") +
        card("Jadwal Mendatang", upcoming.length + " client") +
        card("Total Jadwal Tercatat", db.schedules.length + " entri") +
        "</div>"
      );
    }

    function card(label, value) {
      return (
        '<div class="card stat-card"><div class="label">' +
        escapeHtml(label) +
        '</div><div class="value">' +
        escapeHtml(value) +
        "</div></div>"
      );
    }

    function tableHtml() {
      const rows = list();
      if (!rows.length) {
        return '<div class="table-wrap"><div class="empty-state">Belum ada jadwal untuk tanggal ini.</div></div>';
      }
      const trs = rows
        .map(function (s) {
          return (
            "<tr>" +
            "<td>" + formatDate(s.date) + "</td>" +
            "<td><strong>" + escapeHtml(s.client) + "</strong><br><span class=\"sans\" style=\"color:var(--muted); font-size:12px;\">" + escapeHtml(s.location || "-") + "</span></td>" +
            "<td>" + escapeHtml(s.menu) + "</td>" +
            "<td>" + escapeHtml(s.departureTime) + "</td>" +
            "<td>" + escapeHtml(s.standbyTime) + "</td>" +
            "<td>" + escapeHtml(s.staff) + "</td>" +
            "<td>" +
              (canEdit
                ? '<div class="row-actions">' +
                  '<button class="icon-btn" data-edit="' + s.id + '">Edit</button>' +
                  '<button class="icon-btn danger" data-del="' + s.id + '">Hapus</button>' +
                  "</div>"
                : '<span class="pill pill-grey">Lihat saja</span>') +
            "</td>" +
            "</tr>"
          );
        })
        .join("");

      return (
        '<div class="table-wrap"><table><thead><tr>' +
        "<th>Tanggal</th><th>Client & Lokasi</th><th>Menu</th><th>Jam Berangkat</th><th>Jam Standby</th><th>Staff In Charge</th><th>Aksi</th>" +
        "</tr></thead><tbody>" +
        trs +
        "</tbody></table></div>"
      );
    }

    function formHtml(existing) {
      const s = existing || { date: todayISO(), client: "", menu: "", departureTime: "", standbyTime: "", staff: "", location: "", notes: "" };
      return (
        '<h3>' + (existing ? "Edit Jadwal" : "Tambah Jadwal Client") + "</h3>" +
        '<p class="modal-sub">Lengkapi detail jadwal keberangkatan & operasional client.</p>' +
        '<form id="scheduleForm">' +
        '<div class="form-grid">' +
          field("Tanggal", "date", "date", s.date, true) +
          field("Nama Client", "client", "text", s.client, true) +
          fieldFull("Menu Yang Keluar", "menu", s.menu, true, true) +
          field("Jam Keberangkatan", "departureTime", "time", s.departureTime, true) +
          field("Jam Standby Di Lokasi", "standbyTime", "time", s.standbyTime, true) +
          field("Staff In Charge", "staff", "text", s.staff, true, "Pisahkan dengan koma") +
          field("Lokasi Acara", "location", "text", s.location, false) +
          fieldFull("Catatan Tambahan", "notes", s.notes, false, true) +
        "</div>" +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button>' +
          '<button type="submit" class="btn btn-sm" style="width:auto;">Simpan Jadwal</button>' +
        "</div>" +
        "</form>"
      );
    }

    function field(label, name, type, value, required, placeholder) {
      return (
        '<div class="form-field"><label>' + escapeHtml(label) + "</label>" +
        '<input type="' + type + '" name="' + name + '" value="' + escapeHtml(value || "") + '" ' +
        (required ? "required" : "") +
        (placeholder ? ' placeholder="' + escapeHtml(placeholder) + '"' : "") +
        "></div>"
      );
    }

    function fieldFull(label, name, value, required, textarea) {
      return (
        '<div class="form-field full"><label>' + escapeHtml(label) + "</label>" +
        (textarea
          ? '<textarea name="' + name + '" ' + (required ? "required" : "") + ">" + escapeHtml(value || "") + "</textarea>"
          : '<input type="text" name="' + name + '" value="' + escapeHtml(value || "") + '" ' + (required ? "required" : "") + ">") +
        "</div>"
      );
    }

    function openForm(existing) {
      openModal(formHtml(existing), function (modalEl) {
        modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
        modalEl.querySelector("#scheduleForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const fd = new FormData(e.target);
          const data = Object.fromEntries(fd.entries());
          if (existing) {
            Object.assign(existing, data);
          } else {
            db.schedules.push(Object.assign({ id: uid("sch") }, data));
          }
          saveDB(db);
          closeModal();
          renderAll();
        });
      });
    }

    function renderAll() {
      container.innerHTML =
        statCards() +
        '<div class="section-heading">' +
          "<div><h2>Rancangan Jadwal Client</h2><div class=\"sub\">Detail keberangkatan, menu, dan staff in charge</div></div>" +
          (canEdit ? '<button class="btn btn-sm" style="width:auto;" id="addScheduleBtn">+ Tambah Jadwal</button>' : "") +
        "</div>" +
        '<div class="toolbar"><div class="toolbar-left">' +
          '<input type="date" class="search-input" id="filterDate" value="' + escapeHtml(filterDate) + '">' +
          '<button class="icon-btn" id="clearFilter">Tampilkan Semua</button>' +
        "</div></div>" +
        tableHtml() +
        (canEdit ? "" : '<div class="readonly-banner" style="margin-top:18px;">Akun Anda bersifat lihat-saja. Hubungi Administrator untuk menambah atau mengubah jadwal.</div>');

      const addBtn = container.querySelector("#addScheduleBtn");
      if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

      container.querySelector("#filterDate").addEventListener("change", function (e) {
        filterDate = e.target.value;
        renderAll();
      });
      container.querySelector("#clearFilter").addEventListener("click", function () {
        filterDate = "";
        renderAll();
      });

      container.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const item = db.schedules.find((s) => s.id === btn.dataset.edit);
          openForm(item);
        });
      });
      container.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirmAction("Hapus jadwal ini?")) return;
          db.schedules = db.schedules.filter((s) => s.id !== btn.dataset.del);
          saveDB(db);
          renderAll();
        });
      });
    }

    renderAll();
  }

  return { render: render };
})();
