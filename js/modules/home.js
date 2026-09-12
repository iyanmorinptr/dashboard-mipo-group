/* ===========================================================
   MODULE: Home
   Kalender jadwal client + detail lengkap (tampilan lihat-saja).
   Klik tanggal di kalender untuk melihat jadwal hari itu saja.
   Untuk menambah/mengedit jadwal, gunakan menu Schedule.
   =========================================================== */

const HomeModule = (function () {
  const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  function render(container, ctx) {
    const db = loadDB();
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth(); // 0-indexed
    let selectedDate = null; // "YYYY-MM-DD" atau null (tampilkan semua)

    function pad(n) {
      return String(n).padStart(2, "0");
    }
    function dateKey(y, m, d) {
      return y + "-" + pad(m + 1) + "-" + pad(d);
    }

    function statCards() {
      const todayKey = todayISO();
      const todays = db.schedules.filter((s) => s.date === todayKey);
      const upcoming = db.schedules.filter((s) => s.date > todayKey);
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

    function schedulesByDate() {
      const map = {};
      db.schedules.forEach(function (s) {
        (map[s.date] = map[s.date] || []).push(s);
      });
      return map;
    }

    function calendarHtml() {
      const map = schedulesByDate();
      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const startWeekday = firstOfMonth.getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const todayKey = todayISO();

      let cells = "";
      for (let i = 0; i < startWeekday; i++) {
        cells += '<div class="calendar-day other-month"></div>';
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKey(viewYear, viewMonth, d);
        const hasSchedule = !!map[key];
        const isToday = key === todayKey;
        const isSelected = key === selectedDate;
        cells +=
          '<div class="calendar-day' + (isToday ? " today" : "") + (isSelected ? " selected" : "") + '" data-date="' + key + '">' +
          "<span>" + d + "</span>" +
          (hasSchedule ? '<span class="dot"></span>' : "") +
          "</div>";
      }

      const dayLabels = DAY_NAMES.map(function (n) {
        return '<div class="calendar-daylabel">' + n + "</div>";
      }).join("");

      return (
        '<div class="card" style="margin-bottom:26px;">' +
        '<div class="calendar-header">' +
        '<button type="button" class="icon-btn" id="calPrevBtn">&lsaquo; Bulan Lalu</button>' +
        '<div style="font-weight:700; font-size:15px;">' + MONTH_NAMES[viewMonth] + " " + viewYear + "</div>" +
        '<button type="button" class="icon-btn" id="calNextBtn">Bulan Depan &rsaquo;</button>' +
        "</div>" +
        '<div class="calendar-grid calendar-daylabels">' + dayLabels + "</div>" +
        '<div class="calendar-grid">' + cells + "</div>" +
        (selectedDate
          ? '<div style="margin-top:16px; text-align:center;"><button type="button" class="icon-btn" id="calClearBtn">Tampilkan Semua Jadwal</button></div>'
          : "") +
        "</div>"
      );
    }

    function detailCard(s) {
      const todayKey = todayISO();
      const badge = s.date === todayKey ? '<span class="pill pill-gold">Hari Ini</span>' : s.date > todayKey ? '<span class="pill pill-grey">Mendatang</span>' : '<span class="pill pill-grey">Lewat</span>';
      return (
        '<div class="card" style="margin-bottom:16px;">' +
        '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px;">' +
        '<div><div style="font-size:18px; margin-bottom:3px;">' + escapeHtml(s.client) + '</div>' +
        '<div class="sans" style="font-size:12.5px; color:var(--muted);">' + formatDate(s.date) + (s.location ? " &middot; " + escapeHtml(s.location) : "") + "</div></div>" +
        badge +
        "</div>" +
        '<div class="grid grid-4" style="gap:14px;">' +
        detailField("Menu Yang Keluar", scheduleMenuText(s)) +
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
      const rows = db.schedules
        .slice()
        .filter(function (s) { return !selectedDate || s.date === selectedDate; })
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      const cardsHtml = rows.length
        ? rows.map(detailCard).join("")
        : '<div class="table-wrap"><div class="empty-state">' +
          (selectedDate ? "Tidak ada jadwal pada tanggal ini." : "Belum ada jadwal client. Tambahkan lewat menu Schedule.") +
          "</div></div>";

      const heading = selectedDate
        ? "Jadwal Tanggal " + formatDate(selectedDate)
        : "Jadwal Client & Detail Lengkap";

      container.innerHTML =
        statCards() +
        calendarHtml() +
        '<div class="section-heading"><div><h2>' + escapeHtml(heading) + '</h2><div class="sub">Klik tanggal di kalender untuk melihat jadwal hari itu — untuk menambah/mengubah, buka menu Schedule</div></div></div>' +
        cardsHtml;

      container.querySelector("#calPrevBtn").addEventListener("click", function () {
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderAll();
      });
      container.querySelector("#calNextBtn").addEventListener("click", function () {
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderAll();
      });
      container.querySelectorAll(".calendar-day[data-date]").forEach(function (el) {
        el.addEventListener("click", function () {
          const d = el.dataset.date;
          selectedDate = selectedDate === d ? null : d;
          renderAll();
        });
      });
      const clearBtn = container.querySelector("#calClearBtn");
      if (clearBtn) clearBtn.addEventListener("click", function () { selectedDate = null; renderAll(); });
    }

    renderAll();
  }

  return { render: render };
})();
