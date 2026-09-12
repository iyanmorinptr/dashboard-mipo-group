/* ===========================================================
   MODULE: Finance
   Kas perusahaan, pemasukan, pengeluaran, omset, profit.
   Entri dari Invoice yang lunas otomatis masuk ke sini (ref).
   =========================================================== */

const FinanceModule = (function () {
  function render(container, ctx) {
    const db = loadDB();
    const canEdit = ctx.isAdmin;

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

    function renderAll() {
      container.innerHTML =
        statCards() +
        '<div class="section-heading"><div><h2>Riwayat Transaksi</h2><div class="sub">Kas masuk & keluar, termasuk otomatis dari invoice lunas</div></div>' +
        (canEdit ? '<button class="btn btn-sm" style="width:auto;" id="addFinanceBtn">+ Tambah Transaksi</button>' : "") +
        "</div>" +
        tableHtml() +
        (canEdit ? "" : '<div class="readonly-banner" style="margin-top:18px;">Akun Anda bersifat lihat-saja untuk data keuangan.</div>');

      const addBtn = container.querySelector("#addFinanceBtn");
      if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

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
