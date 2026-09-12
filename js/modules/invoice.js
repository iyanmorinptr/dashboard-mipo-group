/* ===========================================================
   MODULE: Invoice
   Pembuatan invoice & rekapan. Saat invoice ditandai LUNAS,
   otomatis tercatat sebagai pemasukan di Finance (dengan
   referensi nomor invoice & nama client). Rincian item bisa
   dipilih langsung dari pricelist resmi (lihat js/pricelist.js)
   supaya tidak perlu ketik manual. Invoice juga bisa ditampilkan
   sebagai kartu cetak (desain Mipo Group) dan diunduh/dibagikan
   sebagai gambar PNG.
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
        '<div class="table-wrap"><table><thead><tr><th>No. Invoice</th><th>Tanggal</th><th>Client</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        trs +
        "</tbody></table></div>"
      );
    }

    function itemRowHtml(item, idx) {
      item = item || { desc: "", qty: 1, price: 0 };
      const selectStyle =
        "width:100%; margin-bottom:6px; border:1px solid transparent; border-radius:10px; padding:9px 12px; font-size:13px; background:var(--cream-2); color:var(--ink);";
      return (
        '<div class="invoice-item-block" data-block="' + idx + '" style="margin-bottom:14px; padding-bottom:12px; border-bottom:1px dashed var(--border);">' +
        '<select class="item-picker" style="' + selectStyle + '">' + pricelistOptionsHtml() + "</select>" +
        '<div class="invoice-items-row" data-row="' + idx + '">' +
        '<input type="text" placeholder="Deskripsi item" name="item_desc_' + idx + '" value="' + escapeHtml(item.desc) + '" required>' +
        '<input type="number" min="1" placeholder="Qty" name="item_qty_' + idx + '" value="' + escapeHtml(item.qty) + '" required>' +
        '<input type="number" min="0" placeholder="Harga satuan" name="item_price_' + idx + '" value="' + escapeHtml(item.price) + '" required>' +
        '<button type="button" class="icon-btn danger" data-remove-row="' + idx + '" title="Hapus baris">&times;</button>' +
        "</div>" +
        "</div>"
      );
    }

    function formHtml(existing) {
      const inv = existing || {
        number: nextInvoiceNumber(),
        client: "",
        clientPhone: "",
        clientVenue: "",
        date: todayISO(),
        dpPercent: 50,
        items: [{ desc: "", qty: 1, price: 0 }],
      };
      const itemsHtml = inv.items.map(function (it, idx) { return itemRowHtml(it, idx); }).join("");
      return (
        "<h3>" + (existing ? "Edit Invoice" : "Buat Invoice Baru") + "</h3>" +
        '<p class="modal-sub">Nomor invoice & client akan menjadi referensi otomatis ke Finance saat dibayar. Pilih item dari pricelist supaya tidak perlu ketik manual.</p>' +
        '<form id="invoiceForm">' +
        '<div class="form-grid">' +
        '<div class="form-field"><label>Nomor Invoice</label><input type="text" name="number" value="' + escapeHtml(inv.number) + '" required></div>' +
        '<div class="form-field"><label>Tanggal</label><input type="date" name="date" value="' + escapeHtml(inv.date) + '" required></div>' +
        '<div class="form-field"><label>Nama Client</label><input type="text" name="client" value="' + escapeHtml(inv.client) + '" required></div>' +
        '<div class="form-field"><label>No. Telepon Client</label><input type="text" name="clientPhone" value="' + escapeHtml(inv.clientPhone) + '" placeholder="mis. 0812xxxxxxx"></div>' +
        '<div class="form-field"><label>Lokasi / Venue</label><input type="text" name="clientVenue" value="' + escapeHtml(inv.clientVenue) + '"></div>' +
        '<div class="form-field"><label>DP (%)</label><input type="number" min="0" max="100" name="dpPercent" value="' + escapeHtml(inv.dpPercent) + '"></div>' +
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
              btn.closest(".invoice-item-block").remove();
            };
          });
        }
        bindRemoveButtons();

        // Pilih item dari pricelist otomatis mengisi deskripsi & harga satuan
        // (qty tetap diisi manual). Pilih "Item kustom" untuk ketik sendiri.
        itemsWrap.addEventListener("change", function (e) {
          if (!e.target.classList.contains("item-picker")) return;
          const val = e.target.value;
          if (!val || val === "__custom__") return;
          const parts = val.split("|");
          const name = parts[0];
          const price = parts[1];
          const block = e.target.closest(".invoice-item-block");
          const descInput = block.querySelector('input[name^="item_desc_"]');
          const priceInput = block.querySelector('input[name^="item_price_"]');
          if (descInput) descInput.value = name;
          if (priceInput) priceInput.value = price;
        });

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

          const payload = {
            number: obj.number,
            date: obj.date,
            client: obj.client,
            clientPhone: obj.clientPhone || "",
            clientVenue: obj.clientVenue || "",
            dpPercent: obj.dpPercent === "" ? 0 : Number(obj.dpPercent),
            items: items,
          };

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

    /* ---------- Kartu invoice bergaya cetak (untuk dilihat & diekspor PNG) ---------- */
    function invoiceCardHtml(inv) {
      const subtotal = invoiceTotal(inv);
      const dpPercent = inv.dpPercent || 0;
      const dpAmount = Math.round((subtotal * dpPercent) / 100);
      const ci = db.companyInfo || {};

      const rows = inv.items
        .map(function (it, idx) {
          const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
          // Baris terakhir tidak diberi garis bawah sendiri — garis atas
          // kotak Subtotal di bawahnya sudah jadi satu-satunya pembatas,
          // supaya tidak ada dua garis yang bertumpuk berdekatan.
          const isLast = idx === inv.items.length - 1;
          const cellBorder = isLast ? "vertical-align:top;" : "border-bottom:1px solid #999; vertical-align:top;";
          return (
            '<tr>' +
            '<td style="padding:14px 8px 14px 0; text-align:left; ' + cellBorder + '">' + escapeHtml(it.desc) + "</td>" +
            '<td style="padding:14px 8px; text-align:center; ' + cellBorder + '">' + escapeHtml(it.qty) + "</td>" +
            '<td style="padding:14px 8px; text-align:right; ' + cellBorder + '">' + formatNumberID(it.price) + "</td>" +
            '<td style="padding:14px 0 14px 8px; text-align:right; ' + cellBorder + '">' + formatNumberID(lineTotal) + "</td>" +
            "</tr>"
          );
        })
        .join("");

      return (
        // Ukuran A4 tegak (210mm x 297mm) pada 96px/inch = 794 x 1123px.
        // Lebar/tinggi ini tetap (bukan max-width:100%) supaya hasil ekspor
        // PNG selalu berproporsi A4 yang benar; di layar sempit kartu ini
        // bisa digeser (lihat #invoiceModalScroll) alih-alih mengecil.
        '<div id="invoiceCardCapture" style="background:#e9e8e6; color:#111; width:794px; min-height:1123px; padding:64px 56px 48px; font-family:-apple-system,BlinkMacSystemFont,\'SF Pro Text\',\'Helvetica Neue\',Arial,sans-serif; box-sizing:border-box; overflow-wrap:break-word; display:flex; flex-direction:column; flex-shrink:0;">' +
          '<div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:34px;">' +
            '<svg viewBox="0 0 300 300" style="width:70px; height:70px; flex-shrink:0;"><path d="M75,237 L75,67.5 L150,156 L225,67.5 L225,216 C225,230 232,237 246,237" fill="none" stroke="#111" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<div style="font-size:40px; font-weight:800; letter-spacing:-0.01em;">INVOICE</div>' +
          "</div>" +

          '<div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:26px; gap:20px;">' +
            '<div>' +
              '<div style="font-weight:700; font-size:13px; letter-spacing:.3px; margin-bottom:8px;">BILLED TO:</div>' +
              '<div style="font-size:14px; line-height:1.7;">' +
                escapeHtml(inv.client || "-") + "<br>" +
                (inv.clientPhone ? escapeHtml(inv.clientPhone) + "<br>" : "") +
                (inv.clientVenue ? escapeHtml(inv.clientVenue) : "") +
              "</div>" +
            "</div>" +
            '<div style="text-align:right; font-size:14px; line-height:1.7; white-space:nowrap;">' +
              "Invoice No. " + escapeHtml(inv.number) + "<br>" +
              formatInvoiceDate(inv.date) +
            "</div>" +
          "</div>" +

          '<table style="width:100%; border-collapse:collapse; font-size:14px;">' +
            '<thead><tr style="background:transparent;">' +
              '<th style="padding:10px 8px 10px 0; text-align:left; font-weight:700; text-transform:none; letter-spacing:normal; color:#111; border-bottom:1.5px solid #111;">Item</th>' +
              '<th style="padding:10px 8px; text-align:center; font-weight:700; text-transform:none; letter-spacing:normal; color:#111; border-bottom:1.5px solid #111;">Quantity</th>' +
              '<th style="padding:10px 8px; text-align:right; font-weight:700; text-transform:none; letter-spacing:normal; color:#111; border-bottom:1.5px solid #111;">Unit Price</th>' +
              '<th style="padding:10px 0 10px 8px; text-align:right; font-weight:700; text-transform:none; letter-spacing:normal; color:#111; border-bottom:1.5px solid #111;">Total</th>' +
            "</tr></thead>" +
            '<tbody>' + rows + "</tbody>" +
          "</table>" +

          '<div style="display:flex; justify-content:flex-end; margin-top:6px;">' +
            '<table style="border-collapse:collapse; font-size:14px; min-width:220px;">' +
              '<tr style="border-top:1.5px solid #111;"><td style="padding:12px 20px 12px 0; font-weight:700; border-bottom:none;">Subtotal</td><td style="padding:12px 0; text-align:right; border-bottom:none;">' + formatNumberID(subtotal) + "</td></tr>" +
              '<tr style="border-top:1.5px solid #111;"><td style="padding:12px 20px 0 0; font-weight:800; font-size:16px; border-bottom:none;">Dp ' + dpPercent + '%</td><td style="padding:12px 0 0; text-align:right; font-weight:800; font-size:20px; border-bottom:none;">' + formatNumberID(dpAmount) + "</td></tr>" +
            "</table>" +
          "</div>" +

          '<div style="font-size:24px; margin-top:56px; margin-bottom:26px;">Thank you!</div>' +

          '<div style="font-size:11.5px; line-height:1.7;">' +
            '<div style="font-weight:700; letter-spacing:.3px; margin-bottom:6px; font-size:11.5px;">PAYMENT INFORMATION</div>' +
            escapeHtml(ci.bankName || "-") + "<br>" +
            "Account Name: " + escapeHtml(ci.accountName || "-") + "<br>" +
            "Account No.: " + escapeHtml(ci.accountNumber || "-") + "<br>" +
            escapeHtml(ci.paymentNote || "") +
          "</div>" +

          '<div style="flex:1; min-height:40px;"></div>' +

          '<div style="text-align:center; margin-top:auto; padding-top:24px;">' +
            '<div style="font-weight:800; font-size:20px; letter-spacing:1px;">MIPO</div>' +
            '<div style="font-size:10px; letter-spacing:4px; color:#8a8a8a; margin-top:2px;">GROUP</div>' +
          "</div>" +
        "</div>"
      );
    }

    function getExportFilename(inv) {
      return "Invoice-" + String(inv.number).replace(/[^a-zA-Z0-9]+/g, "-") + ".png";
    }

    function captureCardToBlob() {
      const el = document.getElementById("invoiceCardCapture");
      if (!el || typeof html2canvas !== "function") return Promise.reject(new Error("html2canvas tidak tersedia"));
      return html2canvas(el, { scale: 2, backgroundColor: "#e9e8e6", useCORS: true }).then(function (canvas) {
        return new Promise(function (resolve, reject) {
          canvas.toBlob(function (blob) {
            if (blob) resolve(blob);
            else reject(new Error("Gagal membuat gambar"));
          }, "image/png");
        });
      });
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    function viewInvoice(inv) {
      openModal(
        '<div id="invoiceModalScroll" style="border-radius:22px 22px 0 0; display:flex; justify-content:center; background:#e9e8e6; overflow-x:auto; -webkit-overflow-scrolling:touch;">' + invoiceCardHtml(inv) + "</div>" +
        '<div class="modal-actions" style="padding:18px 28px 24px; margin:0; border-top:1px solid var(--border); background:var(--white); flex-wrap:wrap;">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="closeViewBtn">Tutup</button>' +
          '<button type="button" class="btn btn-outline btn-sm" id="downloadPngBtn">Unduh PNG</button>' +
          '<button type="button" class="btn btn-sm" style="width:auto;" id="shareWaBtn">Bagikan ke WhatsApp</button>' +
        "</div>",
        function (modalEl) {
          const modalBox = modalEl.querySelector(".modal");
          modalBox.style.maxWidth = "860px";
          modalBox.style.padding = "0";
          modalBox.style.overflow = "hidden";
          modalEl.scrollTop = 0;
          modalEl.querySelector("#closeViewBtn").addEventListener("click", closeModal);

          const downloadBtn = modalEl.querySelector("#downloadPngBtn");
          const shareBtn = modalEl.querySelector("#shareWaBtn");

          downloadBtn.addEventListener("click", function () {
            downloadBtn.textContent = "Memproses...";
            captureCardToBlob()
              .then(function (blob) {
                downloadBlob(blob, getExportFilename(inv));
                downloadBtn.textContent = "Unduh PNG";
              })
              .catch(function () {
                downloadBtn.textContent = "Unduh PNG";
                window.alert("Gagal membuat gambar invoice. Coba lagi.");
              });
          });

          shareBtn.addEventListener("click", function () {
            shareBtn.textContent = "Memproses...";
            captureCardToBlob()
              .then(function (blob) {
                const filename = getExportFilename(inv);
                const file = new File([blob], filename, { type: "image/png" });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  navigator
                    .share({ files: [file], title: "Invoice " + inv.number, text: "Invoice " + inv.number + " - " + inv.client })
                    .catch(function () { /* dibatalkan pengguna, tidak perlu ditindaklanjuti */ });
                } else {
                  downloadBlob(blob, filename);
                  window.alert("Gambar invoice sudah diunduh. Buka file-nya lalu bagikan ke WhatsApp secara manual dari galeri/file kamu.");
                }
                shareBtn.textContent = "Bagikan ke WhatsApp";
              })
              .catch(function () {
                shareBtn.textContent = "Bagikan ke WhatsApp";
                window.alert("Gagal membuat gambar invoice. Coba lagi.");
              });
          });
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
        description: "Invoice " + inv.number + " - " + inv.client,
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
