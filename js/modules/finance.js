/* ===========================================================
   MODULE: Finance
   Kas perusahaan, pemasukan, pengeluaran, omset, profit.
   Entri dari Invoice yang lunas otomatis masuk ke sini (ref).
   Bisa diunduh sebagai laporan PDF (ringkasan + rincian transaksi).
   =========================================================== */

const FinanceModule = (function () {
  function render(container, ctx) {
    const db = loadDB();
    const canEdit = ctx.isAdmin;

    let reportFrom = "";
    let reportTo = "";

    function totals() {
      let income = 0, expense = 0;
      db.finance.forEach(function (f) {
        if (f.type === "in") income += Number(f.amount) || 0;
        else expense += Number(f.amount) || 0;
      });
      return { income: income, expense: expense, profit: income - expense, kas: income - expense };
    }

    function statCards() {
      const t = totals();
      return (
        '<div class="grid grid-4">' +
        card("Kas Perusahaan", formatIDR(t.kas)) +
        card("Total Pemasukan / Omset", formatIDR(t.income), "gold") +
        card("Total Pengeluaran", formatIDR(t.expense), "negative") +
        card("Profit", formatIDR(t.profit)) +
        "</div>"
      );
    }

    function card(label, value, cls) {
      return (
        '<div class="card stat-card"><div class="label">' + escapeHtml(label) + "</div>" +
        '<div class="value' + (cls ? " " + cls : "") + '">' + value + "</div></div>"
      );
    }

    function tableHtml() {
      const rows = db.finance.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      if (!rows.length) return '<div class="table-wrap"><div class="empty-state">Belum ada transaksi keuangan.</div></div>';
      const trs = rows
        .map(function (f) {
          return (
            "<tr>" +
            "<td>" + formatDate(f.date) + "</td>" +
            "<td>" + (f.type === "in" ? '<span class="pill pill-green">Pemasukan</span>' : '<span class="pill pill-red">Pengeluaran</span>') + "</td>" +
            "<td>" + escapeHtml(f.category) + "</td>" +
            "<td>" + escapeHtml(f.description) + (f.ref ? '<br><span class="sans" style="font-size:11.5px; color:var(--muted);">Ref: ' + escapeHtml(f.ref) + "</span>" : "") + "</td>" +
            "<td>" + formatIDR(f.amount) + "</td>" +
            "<td>" +
              (canEdit
                ? '<div class="row-actions"><button class="icon-btn" data-edit="' + f.id + '">Edit</button><button class="icon-btn danger" data-del="' + f.id + '">Hapus</button></div>'
                : '<span class="pill pill-grey">Lihat saja</span>') +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
      return (
        '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Jumlah</th><th>Aksi</th></tr></thead><tbody>' +
        trs +
        "</tbody></table></div>"
      );
    }

    function formHtml(existing) {
      const f = existing || { date: todayISO(), type: "in", category: "", description: "", amount: "" };
      return (
        "<h3>" + (existing ? "Edit Transaksi" : "Tambah Transaksi") + "</h3>" +
        '<p class="modal-sub">Catat pemasukan atau pengeluaran kas perusahaan.</p>' +
        '<form id="financeForm"><div class="form-grid">' +
        '<div class="form-field"><label>Tanggal</label><input type="date" name="date" value="' + escapeHtml(f.date) + '" required></div>' +
        '<div class="form-field"><label>Jenis</label><select name="type">' +
          '<option value="in"' + (f.type === "in" ? " selected" : "") + ">Pemasukan</option>" +
          '<option value="out"' + (f.type === "out" ? " selected" : "") + ">Pengeluaran</option>" +
        "</select></div>" +
        '<div class="form-field"><label>Kategori</label><input type="text" name="category" value="' + escapeHtml(f.category) + '" required placeholder="mis. Operasional, Jasa, Gaji"></div>' +
        '<div class="form-field"><label>Jumlah (Rp)</label><input type="number" min="0" name="amount" value="' + escapeHtml(f.amount) + '" required></div>' +
        '<div class="form-field full"><label>Keterangan</label><input type="text" name="description" value="' + escapeHtml(f.description) + '" required></div>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;">Simpan</button></div>' +
        "</form>"
      );
    }

    function openForm(existing) {
      openModal(formHtml(existing), function (modalEl) {
        modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
        modalEl.querySelector("#financeForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.target).entries());
          if (existing) {
            Object.assign(existing, data);
          } else {
            db.finance.push(Object.assign({ id: uid("fin"), ref: "" }, data));
          }
          saveDB(db);
          closeModal();
          renderAll();
        });
      });
    }

    /* ---------- Laporan Keuangan (PDF) ---------- */
    function reportTransactions() {
      return db.finance.filter(function (f) {
        if (reportFrom && f.date < reportFrom) return false;
        if (reportTo && f.date > reportTo) return false;
        return true;
      });
    }

    function summaryBoxHtml(label, value) {
      return (
        '<div style="background:#fff; border-radius:12px; padding:16px;">' +
        '<div style="font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#777; margin-bottom:6px;">' + escapeHtml(label) + "</div>" +
        '<div style="font-size:19px; font-weight:700;">' + value + "</div>" +
        "</div>"
      );
    }

    function reportCardHtml() {
      const rows = reportTransactions().slice().sort((a, b) => (a.date > b.date ? 1 : -1));
      let income = 0, expense = 0;
      rows.forEach(function (f) {
        if (f.type === "in") income += Number(f.amount) || 0;
        else expense += Number(f.amount) || 0;
      });
      const profit = income - expense;

      const periodText =
        reportFrom || reportTo
          ? (reportFrom ? formatDate(reportFrom) : "Awal") + " s/d " + (reportTo ? formatDate(reportTo) : "Sekarang")
          : "Seluruh Periode";

      const trs = rows
        .map(function (f) {
          return (
            "<tr>" +
            '<td style="padding:10px 8px 10px 0; text-align:left; border-bottom:1px solid #999;">' + formatDate(f.date) + "</td>" +
            '<td style="padding:10px 8px; text-align:left; border-bottom:1px solid #999;">' + (f.type === "in" ? "Pemasukan" : "Pengeluaran") + "</td>" +
            '<td style="padding:10px 8px; text-align:left; border-bottom:1px solid #999;">' + escapeHtml(f.category) + "</td>" +
            '<td style="padding:10px 8px; text-align:left; border-bottom:1px solid #999;">' + escapeHtml(f.description) + "</td>" +
            '<td style="padding:10px 0 10px 8px; text-align:right; border-bottom:1px solid #999;">' + formatNumberID(f.amount) + "</td>" +
            "</tr>"
          );
        })
        .join("");

      return (
        '<div id="financeReportCapture" style="background:#e9e8e6; color:#111; width:794px; padding:64px 56px 56px; font-family:-apple-system,BlinkMacSystemFont,\'SF Pro Text\',\'Helvetica Neue\',Arial,sans-serif; box-sizing:border-box;">' +
        '<div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:34px;">' +
        '<svg viewBox="0 0 300 300" style="width:64px; height:64px; flex-shrink:0;"><path d="M75,237 L75,67.5 L150,156 L225,67.5 L225,216 C225,230 232,237 246,237" fill="none" stroke="#111" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<div style="text-align:right;">' +
        '<div style="font-size:32px; font-weight:800; letter-spacing:-0.01em;">LAPORAN KEUANGAN</div>' +
        '<div style="font-size:13px; color:#555; margin-top:6px;">' + escapeHtml(periodText) + "</div>" +
        "</div>" +
        "</div>" +
        '<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:34px;">' +
        summaryBoxHtml("Total Pemasukan", formatNumberID(income)) +
        summaryBoxHtml("Total Pengeluaran", formatNumberID(expense)) +
        summaryBoxHtml("Profit", formatNumberID(profit)) +
        summaryBoxHtml("Jumlah Transaksi", String(rows.length)) +
        "</div>" +
        '<table style="width:100%; border-collapse:collapse; font-size:12.5px;">' +
        '<thead><tr>' +
        '<th style="text-align:left; padding:10px 8px 10px 0; border-bottom:1.5px solid #111; font-weight:700; text-transform:none;">Tanggal</th>' +
        '<th style="text-align:left; padding:10px 8px; border-bottom:1.5px solid #111; font-weight:700; text-transform:none;">Jenis</th>' +
        '<th style="text-align:left; padding:10px 8px; border-bottom:1.5px solid #111; font-weight:700; text-transform:none;">Kategori</th>' +
        '<th style="text-align:left; padding:10px 8px; border-bottom:1.5px solid #111; font-weight:700; text-transform:none;">Keterangan</th>' +
        '<th style="text-align:right; padding:10px 0 10px 8px; border-bottom:1.5px solid #111; font-weight:700; text-transform:none;">Jumlah</th>' +
        "</tr></thead>" +
        "<tbody>" +
        (trs || '<tr><td colspan="5" style="padding:24px 0; text-align:center; color:#888;">Tidak ada transaksi pada periode ini.</td></tr>') +
        "</tbody>" +
        "</table>" +
        '<div style="text-align:center; margin-top:60px;">' +
        '<div style="font-weight:800; font-size:18px; letter-spacing:1px;">MIPO</div>' +
        '<div style="font-size:9px; letter-spacing:4px; color:#8a8a8a; margin-top:2px;">GROUP</div>' +
        '<div class="sans" style="font-size:10px; color:#999; margin-top:10px;">Dicetak pada ' + formatInvoiceDate(todayISO()) + "</div>" +
        "</div>" +
        "</div>"
      );
    }

    function downloadReportPdf(btn) {
      if (typeof html2canvas !== "function" || !window.jspdf) {
        window.alert("Fitur PDF belum siap dimuat. Coba lagi sesaat lagi.");
        return;
      }
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Membuat PDF...";

      const holder = document.createElement("div");
      holder.style.position = "fixed";
      holder.style.left = "-10000px";
      holder.style.top = "0";
      holder.innerHTML = reportCardHtml();
      document.body.appendChild(holder);
      const el = holder.querySelector("#financeReportCapture");

      html2canvas(el, { scale: 2, backgroundColor: "#e9e8e6", useCORS: true })
        .then(function (canvas) {
          const jsPDF = window.jspdf.jsPDF;
          const pdf = new jsPDF("p", "mm", "a4");
          const imgWidth = 210;
          const pageHeight = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const imgData = canvas.toDataURL("image/png");

          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
          pdf.save("Laporan-Keuangan-Mipo-Group-" + todayISO() + ".pdf");
        })
        .catch(function () {
          window.alert("Gagal membuat laporan PDF. Coba lagi.");
        })
        .finally(function () {
          holder.remove();
          btn.disabled = false;
          btn.textContent = originalText;
        });
    }

    function reportToolbarHtml() {
      return (
        '<div class="card" style="margin-bottom:26px;">' +
        '<div class="label sans" style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:14px;">Laporan Keuangan</div>' +
        '<div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end;">' +
        '<div><label class="sans" style="display:block; font-size:11px; color:var(--muted); margin-bottom:6px;">Dari Tanggal</label><input type="date" class="search-input" id="reportFromInput" value="' + escapeHtml(reportFrom) + '"></div>' +
        '<div><label class="sans" style="display:block; font-size:11px; color:var(--muted); margin-bottom:6px;">Sampai Tanggal</label><input type="date" class="search-input" id="reportToInput" value="' + escapeHtml(reportTo) + '"></div>' +
        '<button type="button" class="btn btn-sm" style="width:auto;" id="downloadReportBtn">Unduh Laporan (PDF)</button>' +
        "</div>" +
        '<div class="sans" style="font-size:11.5px; color:var(--muted); margin-top:10px;">Kosongkan tanggal untuk mencakup seluruh periode.</div>' +
        "</div>"
      );
    }

    function renderAll() {
      container.innerHTML =
        statCards() +
        reportToolbarHtml() +
        '<div class="section-heading"><div><h2>Riwayat Transaksi</h2><div class="sub">Kas masuk & keluar, termasuk otomatis dari invoice lunas</div></div>' +
        (canEdit ? '<button class="btn btn-sm" style="width:auto;" id="addFinanceBtn">+ Tambah Transaksi</button>' : "") +
        "</div>" +
        tableHtml() +
        (canEdit ? "" : '<div class="readonly-banner" style="margin-top:18px;">Akun Anda bersifat lihat-saja untuk data keuangan.</div>');

      const addBtn = container.querySelector("#addFinanceBtn");
      if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

      container.querySelector("#reportFromInput").addEventListener("change", function (e) {
        reportFrom = e.target.value;
      });
      container.querySelector("#reportToInput").addEventListener("change", function (e) {
        reportTo = e.target.value;
      });
      container.querySelector("#downloadReportBtn").addEventListener("click", function (e) {
        downloadReportPdf(e.currentTarget);
      });

      container.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const item = db.finance.find((f) => f.id === btn.dataset.edit);
          openForm(item);
        });
      });
      container.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirmAction("Hapus transaksi ini?")) return;
          db.finance = db.finance.filter((f) => f.id !== btn.dataset.del);
          saveDB(db);
          renderAll();
        });
      });
    }

    renderAll();
  }

  return { render: render };
})();
