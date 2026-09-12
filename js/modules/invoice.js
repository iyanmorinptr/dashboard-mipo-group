/* ===========================================================
   MODULE: Invoice
   Pembuatan invoice & rekapan. Saat invoice ditandai LUNAS,
   otomatis tercatat sebagai pemasukan di Finance (dengan
   referensi nomor invoice, nama client & nama transaksi).
   =========================================================== */

const InvoiceModule = (function () {
  function render(container, ctx) {
    const db = loadDB();
    const canEdit = ctx.isAdmin;

    function nextInvoiceNumber() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const countThisMonth = db.invoices.filter((i) => i.number.includes("/" + y + "/" + m + "/")).length + 1;
      return "INV/" + y + "/" + m + "/" + String(countThisMonth).padStart(3, "0");
    }

    function statCards() {
      const total = db.invoices.length;
      const paid = db.invoices.filter((i) => i.status === "paid").length;
      const unpaid = total - paid;
      const totalValue = db.invoices.reduce((s, i) => s + invoiceTotal(i), 0);
      return (
        '<div class="grid grid-4">' +
        card("Total Invoice", String(total)) +
        card("Lunas", String(paid)) +
        card("Belum Lunas", String(unpaid)) +
        card("Nilai Total Invoice", formatIDR(totalValue), "gold") +
        "</div>"
      );
    }
    function card(label, value, cls) {
      return '<div class="card stat-card"><div class="label">' + escapeHtml(label) + '</div><div class="value' + (cls ? " " + cls : "") + '">' + value + "</div></div>";
    }

    function tableHtml() {
      const rows = db.invoices.slice().sort((a, b) => (a.number < b.number ? 1 : -1));
      if (!rows.length) return '<div class="table-wrap"><div class="empty-state">Belum ada invoice.</div></div>';
      const trs = rows
        .map(function (inv) {
          const total = invoiceTotal(inv);
          return (
            "<tr>" +
            "<td><strong>" + escapeHtml(inv.number) + "</strong></td>" +
            "<td>" + formatDate(inv.date) + "</td>" +
            "<td>" + escapeHtml(inv.client) + "</td>" +
            "<td>" + escapeHtml(inv.transaction) + "</td>" +
            "<td>" + formatIDR(total) + "</td>" +
            "<td>" + (inv.status === "paid" ? '<span class="pill pill-green">Lunas</span>' : '<span class="pill pill-gold">Belum Lunas</span>') + "</td>" +
            "<td><div class=\"row-actions\">" +
              '<button class="icon-btn" data-view="' + inv.id + '">Lihat</button>' +
              (canEdit && inv.status !== "paid" ? '<button class="icon-btn" data-edit="' + inv.id + '">Edit</button>' : "") +
              (canEdit && inv.status !== "paid" ? '<button class="icon-btn" data-paid="' + inv.id + '">Tandai Lunas</button>' : "") +
              (canEdit ? '<button class="icon-btn danger" data-del="' + inv.id + '">Hapus</button>' : "") +
            "</div></td>" +
            "</tr>"
          );
        })
        .join("");
      return (
        '<div class="table-wrap"><table><thead><tr><th>No. Invoice</th><th>Tanggal</th><th>Client</th><th>Transaksi</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        trs +
        "</tbody></table></div>"
      );
    }

    function itemRowHtml(item, idx) {
      item = item || { desc: "", qty: 1, price: 0 };
      return (
        '<div class="invoice-items-row" data-row="' + idx + '">' +
        '<input type="text" placeholder="Deskripsi item" name="item_desc_' + idx + '" value="' + escapeHtml(item.desc) + '" required>' +
        '<input type="number" min="1" placeholder="Qty" name="item_qty_' + idx + '" value="' + escapeHtml(item.qty) + '" required>' +
        '<input type="number" min="0" placeholder="Harga satuan" name="item_price_' + idx + '" value="' + escapeHtml(item.price) + '" required>' +
        '<button type="button" class="icon-btn danger" data-remove-row="' + idx + '" title="Hapus baris">&times;</button>' +
        "</div>"
      );
    }

    function formHtml(existing) {
      const inv = existing || { number: nextInvoiceNumber(), client: "", transaction: "", date: todayISO(), items: [{ desc: "", qty: 1, price: 0 }] };
      const itemsHtml = inv.items.map(function (it, idx) { return itemRowHtml(it, idx); }).join("");
      return (
        "<h3>" + (existing ? "Edit Invoice" : "Buat Invoice Baru") + "</h3>" +
        '<p class="modal-sub">Nomor invoice, client dan transaksi akan menjadi referensi otomatis ke Finance saat dibayar.</p>' +
        '<form id="invoiceForm">' +
        '<div class="form-grid">' +
        '<div class="form-field"><label>Nomor Invoice</label><input type="text" name="number" value="' + escapeHtml(inv.number) + '" required></div>' +
        '<div class="form-field"><label>Tanggal</label><input type="date" name="date" value="' + escapeHtml(inv.date) + '" required></div>' +
        '<div class="form-field"><label>Nama Client</label><input type="text" name="client" value="' + escapeHtml(inv.client) + '" required></div>' +
        '<div class="form-field"><label>Nama Transaksi</label><input type="text" name="transaction" value="' + escapeHtml(inv.transaction) + '" required></div>' +
        "</div>" +
        '<div style="margin-top:18px;"><label class="sans" style="display:block; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:9px;">Rincian Item</label>' +
        '<div id="itemsWrap">' + itemsHtml + "</div>" +
        '<button type="button" class="icon-btn" id="addItemRow" style="margin-top:6px;">+ Tambah Item</button>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;">Simpan Invoice</button></div>' +
        "</form>"
      );
    }

    function openForm(existing) {
      let rowCount = existing ? existing.items.length : 1;
      openModal(formHtml(existing), function (modalEl) {
        modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
        const itemsWrap = modalEl.querySelector("#itemsWrap");

        modalEl.querySelector("#addItemRow").addEventListener("click", function () {
          const div = document.createElement("div");
          div.innerHTML = itemRowHtml(null, rowCount);
          itemsWrap.appendChild(div.firstChild);
          rowCount++;
          bindRemoveButtons();
        });

        function bindRemoveButtons() {
          itemsWrap.querySelectorAll("[data-remove-row]").forEach(function (btn) {
            btn.onclick = function () {
              if (itemsWrap.children.length <= 1) return;
              btn.closest(".invoice-items-row").remove();
            };
          });
        }
        bindRemoveButtons();

        modalEl.querySelector("#invoiceForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const fd = new FormData(e.target);
          const obj = Object.fromEntries(fd.entries());
          const items = [];
          itemsWrap.querySelectorAll(".invoice-items-row").forEach(function (row) {
            const desc = row.querySelector('input[name^="item_desc_"]').value;
            const qty = row.querySelector('input[name^="item_qty_"]').value;
            const price = row.querySelector('input[name^="item_price_"]').value;
            if (desc) items.push({ desc: desc, qty: Number(qty) || 0, price: Number(price) || 0 });
          });

          const payload = { number: obj.number, date: obj.date, client: obj.client, transaction: obj.transaction, items: items };

          if (existing) {
            Object.assign(existing, payload);
          } else {
            db.invoices.push(Object.assign({ id: uid("inv"), status: "unpaid" }, payload));
          }
          saveDB(db);
          closeModal();
          renderAll();
        });
      });
    }

    function viewInvoice(inv) {
      const total = invoiceTotal(inv);
      const rows = inv.items
        .map(function (it) {
          return (
            "<tr><td>" + escapeHtml(it.desc) + "</td><td>" + it.qty + "</td><td>" + formatIDR(it.price) + "</td><td>" + formatIDR(it.qty * it.price) + "</td></tr>"
          );
        })
        .join("");
      openModal(
        "<h3>" + escapeHtml(inv.number) + "</h3>" +
        '<p class="modal-sub">' + escapeHtml(inv.client) + " &mdash; " + escapeHtml(inv.transaction) + " &mdash; " + formatDate(inv.date) + "</p>" +
        '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>' +
        rows +
        '</tbody></table></div>' +
        '<div style="text-align:right; margin-top:14px; font-size:18px;">Total: <strong>' + formatIDR(total) + "</strong></div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="closeViewBtn">Tutup</button></div>',
        function (modalEl) {
          modalEl.querySelector("#closeViewBtn").addEventListener("click", closeModal);
        }
      );
    }

    function markPaid(inv) {
      if (!confirmAction("Tandai invoice " + inv.number + " sebagai lunas? Ini akan otomatis tercatat sebagai pemasukan di Finance.")) return;
      inv.status = "paid";
      db.finance.push({
        id: uid("fin"),
        date: todayISO(),
        type: "in",
        category: "Pemasukan Invoice",
        description: inv.transaction + " - " + inv.client,
        amount: invoiceTotal(inv),
        ref: inv.number,
      });
      saveDB(db);
      renderAll();
    }

    function renderAll() {
      container.innerHTML =
        statCards() +
        '<div class="section-heading"><div><h2>Rekapan Invoice</h2><div class="sub">Riwayat invoice & status pembayaran</div></div>' +
        (canEdit ? '<button class="btn btn-sm" style="width:auto;" id="addInvoiceBtn">+ Buat Invoice</button>' : "") +
        "</div>" +
        tableHtml() +
        (canEdit ? "" : '<div class="readonly-banner" style="margin-top:18px;">Akun Anda bersifat lihat-saja untuk invoice.</div>');

      const addBtn = container.querySelector("#addInvoiceBtn");
      if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

      container.querySelectorAll("[data-view]").forEach(function (btn) {
        btn.addEventListener("click", function () { viewInvoice(db.invoices.find((i) => i.id === btn.dataset.view)); });
      });
      container.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () { openForm(db.invoices.find((i) => i.id === btn.dataset.edit)); });
      });
      container.querySelectorAll("[data-paid]").forEach(function (btn) {
        btn.addEventListener("click", function () { markPaid(db.invoices.find((i) => i.id === btn.dataset.paid)); });
      });
      container.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirmAction("Hapus invoice ini?")) return;
          db.invoices = db.invoices.filter((i) => i.id !== btn.dataset.del);
          saveDB(db);
          renderAll();
        });
      });
    }

    renderAll();
  }

  return { render: render };
})();
