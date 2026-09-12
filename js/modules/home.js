/* ===========================================================
   MODULE: Home
   Ringkasan & detail lengkap jadwal client (tampilan lihat-saja).
   Untuk menambah/mengedit jadwal, gunakan menu Schedule.
   =========================================================== */

const HomeModule = (function () {
  function render(container, ctx) {
    const db = loadDB();

    function statCards() {
      const today = todayISO();
      const todays = db.schedules.filter((s) => s.date === today);
      const upcoming = db.schedules.filter((s) => s.date > today);
      return (
        '<div class="grid grid-3">' +
        card("Jadwal Hari Ini", todays.length + " client") +
        card("Jadwal Mendatang", upcoming.length + " client") +
        card("Total Client Terjadwal", db.schedules.length + " entri") +
        "</div>"
      );
    }
    function card(label, value) {
      return '<div class="card stat-card"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + escapeHtml(value) + "</div></div>";
    }

    function detailCard(s) {
      const today = todayISO();
      const badge = s.date === today ? '<span class="pill pill-gold">Hari Ini</span>' : s.date > today ? '<span class="pill pill-grey">Mendatang</span>' : '<span class="pill pill-grey">Lewat</span>';
      return (
        '<div class="card" style="margin-bottom:16px;">' +
        '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px;">' +
          '<div><div style="font-size:18px; margin-bottom:3px;">' + escapeHtml(s.client) + '</div>' +
          '<div class="sans" style="font-size:12.5px; color:var(--muted);">' + formatDate(s.date) + (s.location ? " &middot; " + escapeHtml(s.location) : "") + "</div></div>" +
          badge +
        "</div>" +
        '<div class="grid grid-4" style="gap:14px;">' +
          detailField("Menu Yang Keluar", s.menu) +
          detailField("Jam Keberangkatan", s.departureTime) +
          detailField("Jam Standby Di Lokasi", s.standbyTime) +
          detailField("Staff In Charge", s.staff) +
        "</div>" +
        (s.notes ? '<div style="margin-top:14px;"><div class="sans" style="font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:5px;">Catatan</div><div style="font-size:13.5px;">' + escapeHtml(s.notes) + "</div></div>" : "") +
        "</div>"
      );
    }

    function detailField(label, value) {
      return (
        '<div><div class="sans" style="font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:5px;">' +
        escapeHtml(label) +
        '</div><div style="font-size:13.5px;">' +
        escapeHtml(value || "-") +
        "</div></div>"
      );
    }

    function renderAll() {
      const rows = db.schedules.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      const cardsHtml = rows.length
        ? rows.map(detailCard).join("")
        : '<div class="table-wrap"><div class="empty-state">Belum ada jadwal client. Tambahkan lewat menu Schedule.</div></div>';

      container.innerHTML =
        statCards() +
        '<div class="section-heading"><div><h2>Jadwal Client & Detail Lengkap</h2><div class="sub">Ringkasan seluruh jadwal — untuk menambah atau mengubah, buka menu Schedule</div></div></div>' +
        cardsHtml;
    }

    renderAll();
  }

  return { render: render };
})();
