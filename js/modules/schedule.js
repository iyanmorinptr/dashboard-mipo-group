/* ===========================================================
   MODULE: Schedule
   Kalender bergaya iPhone — klik tanggal untuk mencatat jadwal
   per brand (Koneo, Runna, Kada-Kadi, Warmiepo), termasuk saat
   beberapa brand berjalan di tanggal yang sama. Setiap jadwal
   diberi warna sesuai brand supaya langsung terlihat di kalender.
   Input & edit hanya untuk role admin.
   =========================================================== */

const ScheduleModule = (function () {
  const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  function render(container, ctx) {
    const db = loadDB();
    const canEdit = ctx.isAdmin;

    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    let selectedDate = todayISO();

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
        card("Jadwal Hari Ini", todays.length + " entri") +
        card("Jadwal Mendatang", upcoming.length + " entri") +
        card("Total Jadwal Tercatat", db.schedules.length + " entri") +
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

    function legendHtml() {
      return (
        '<div class="cal-legend">' +
        BRANDS.map(function (b) {
          return (
            '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:' + b.color + ';"></span>' +
            escapeHtml(b.name) +
            "</div>"
          );
        }).join("") +
        "</div>"
      );
    }

    function calendarHtml() {
      const map = schedulesByDate();
      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const startWeekday = firstOfMonth.getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const todayKey = todayISO();

      let cells = "";
      for (let i = 0; i < startWeekday; i++) {
        cells += '<div class="calendar-day cal-day-rich other-month"></div>';
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKey(viewYear, viewMonth, d);
        const entries = map[key] || [];
        const isToday = key === todayKey;
        const isSelected = key === selectedDate;

        const maxChips = 3;
        const chips = entries
          .slice(0, maxChips)
          .map(function (s) {
            return (
              '<div class="cal-chip" style="background:' + brandColor(s.brand) + ';" title="' +
              escapeHtml(brandName(s.brand) + " — " + s.client) + '"></div>'
            );
          })
          .join("");
        const more = entries.length > maxChips ? '<div class="cal-more">+' + (entries.length - maxChips) + "</div>" : "";

        cells +=
          '<div class="calendar-day cal-day-rich' + (isToday ? " today" : "") + (isSelected ? " selected" : "") + '" data-date="' + key + '">' +
          '<span class="cal-daynum">' + d + "</span>" +
          '<div class="cal-chips">' + chips + more + "</div>" +
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
        legendHtml() +
        "</div>"
      );
    }

    function paymentPill(s) {
      const info = paymentStatusInfo(s.paymentStatus);
      return '<span class="pill ' + info.pillClass + '">' + escapeHtml(info.label) + "</span>";
    }

    function invoiceLinksHtml(s) {
      if (s.combinedInvoiceId) {
        const combined = db.invoices.find(function (i) { return i.id === s.combinedInvoiceId; });
        if (combined) {
          return (
            '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;">' +
            '<button type="button" class="icon-btn" data-goto-invoice="' + combined.id + '">Invoice Gabungan (' + escapeHtml(combined.number) + ")</button>" +
            "</div>"
          );
        }
      }
      const parts = [];
      if (s.invoiceId) {
        const inv = db.invoices.find(function (i) { return i.id === s.invoiceId; });
        if (inv) {
          const label = inv.invoiceKind === "full" ? "Invoice Lunas" : "Invoice DP 50%";
          parts.push('<button type="button" class="icon-btn" data-goto-invoice="' + inv.id + '">' + escapeHtml(label) + " (" + escapeHtml(inv.number) + ")</button>");
        }
      }
      if (s.pelunasanInvoiceId) {
        const inv2 = db.invoices.find(function (i) { return i.id === s.pelunasanInvoiceId; });
        if (inv2) {
          parts.push('<button type="button" class="icon-btn" data-goto-invoice="' + inv2.id + '">Invoice Pelunasan (' + escapeHtml(inv2.number) + ")</button>");
        }
      }
      return parts.length ? '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;">' + parts.join("") + "</div>" : "";
    }

    function proofThumbHtml(s) {
      if (!s.proofImage) return "";
      return '<img class="proof-thumb" src="' + s.proofImage + '" data-view-proof="' + s.id + '" title="Lihat bukti transfer">';
    }

    function viewProofImage(src) {
      openModal(
        '<h3 style="margin-bottom:14px;">Bukti Transfer</h3><img src="' + src + '" style="width:100%; border-radius:12px; display:block;">' +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="closeProofBtn">Tutup</button></div>',
        function (modalEl) {
          modalEl.querySelector("#closeProofBtn").addEventListener("click", closeModal);
        }
      );
    }

    function detailCard(s) {
      return (
        '<div class="card" style="margin-bottom:16px; border-left:4px solid ' + brandColor(s.brand) + ';">' +
        '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap;">' +
        '<div><div class="sans" style="font-size:11px; letter-spacing:1px; text-transform:uppercase; color:' + brandColor(s.brand) + '; font-weight:700; margin-bottom:4px;">' + escapeHtml(brandName(s.brand)) + '</div>' +
        '<div style="font-size:18px; margin-bottom:3px;">' + escapeHtml(s.client) + '</div>' +
        '<div class="sans" style="font-size:12.5px; color:var(--muted);">' + formatDate(s.date) + (s.location ? " &middot; " + escapeHtml(s.location) : "") + "</div></div>" +
        '<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">' + paymentPill(s) + proofThumbHtml(s) +
          (canEdit
            ? '<button class="icon-btn" data-edit="' + s.id + '">Edit</button>' +
              '<button class="icon-btn danger" data-del="' + s.id + '">Hapus</button>'
            : "") +
        "</div>" +
        "</div>" +
        '<div class="grid grid-4" style="gap:14px;">' +
        detailField("Menu Yang Keluar", scheduleMenuText(s)) +
        detailField("Jam Keberangkatan", s.departureTime) +
        detailField("Jam Ready Di Lokasi", s.standbyTime) +
        detailField("Staff In Charge", s.staff) +
        detailField("Hub Via", channelLabel(s.contactChannel)) +
        "</div>" +
        (s.notes ? '<div style="margin-top:14px;"><div class="sans" style="font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:5px;">Catatan</div><div style="font-size:13.5px;">' + escapeHtml(s.notes) + "</div></div>" : "") +
        invoiceLinksHtml(s) +
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

    function menuItemRowHtml(item, idx) {
      item = item || { name: "", qty: 1 };
      const selectStyle =
        "width:100%; margin-bottom:6px; border:1px solid transparent; border-radius:10px; padding:9px 12px; font-size:13px; background:var(--cream-2); color:var(--ink);";
      return (
        '<div class="menu-item-block" data-block="' + idx + '" style="margin-bottom:14px; padding-bottom:12px; border-bottom:1px dashed var(--border);">' +
        '<select class="menu-item-picker" style="' + selectStyle + '">' + pricelistOptionsHtml() + "</select>" +
        '<div class="menu-item-row" style="display:grid; grid-template-columns:1fr 90px 32px; gap:8px; align-items:center;">' +
        '<input type="text" placeholder="Nama menu/item" name="menu_name_' + idx + '" value="' + escapeHtml(item.name) + '" required>' +
        '<input type="number" min="1" placeholder="Qty" name="menu_qty_' + idx + '" value="' + escapeHtml(item.qty) + '" required>' +
        '<button type="button" class="icon-btn danger" data-remove-menu-row="' + idx + '" title="Hapus baris">&times;</button>' +
        "</div>" +
        "</div>"
      );
    }

    function brandOptionsHtml(selected) {
      return BRANDS.map(function (b) {
        return '<option value="' + b.id + '"' + (b.id === selected ? " selected" : "") + ">" + escapeHtml(b.name) + "</option>";
      }).join("");
    }

    function channelOptionsHtml(selected) {
      return CONTACT_CHANNELS.map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === selected ? " selected" : "") + ">" + escapeHtml(c.label) + "</option>";
      }).join("");
    }

    function paymentStatusOptionsHtml(selected) {
      return PAYMENT_STATUSES.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === selected ? " selected" : "") + ">" + escapeHtml(p.label) + "</option>";
      }).join("");
    }

    function formHtml(existing, prefillDate) {
      const s = existing || {
        date: prefillDate || todayISO(),
        brand: "koneo",
        client: "",
        departureTime: "",
        standbyTime: "",
        staff: "",
        location: "",
        paymentStatus: "unpaid",
        proofImage: "",
        contactChannel: "whatsapp",
        notes: "",
      };
      const menuItems = s.menuItems && s.menuItems.length ? s.menuItems : [{ name: "", qty: 1 }];
      const menuItemsHtml = menuItems.map(function (it, idx) { return menuItemRowHtml(it, idx); }).join("");
      return (
        '<h3>' + (existing ? "Edit Jadwal" : "Tambah Jadwal Brand") + "</h3>" +
        '<p class="modal-sub">Lengkapi detail jadwal operasional. Satu tanggal bisa memiliki beberapa jadwal dari brand yang berbeda.</p>' +
        '<form id="scheduleForm">' +
        '<div class="form-grid">' +
          field("Tanggal", "date", "date", s.date, true) +
          selectField("Brand", "brand", brandOptionsHtml(s.brand)) +
          field("Nama Client", "client", "text", s.client, true) +
          field("Lokasi Acara", "location", "text", s.location, true) +
          field("Jam Keberangkatan", "departureTime", "time", s.departureTime, true) +
          field("Jam Ready Di Lokasi", "standbyTime", "time", s.standbyTime, true) +
          field("Staff In Charge", "staff", "text", s.staff, true, "Pisahkan dengan koma") +
          selectField("Hub Via", "contactChannel", channelOptionsHtml(s.contactChannel)) +
          selectField("Checklist Pembayaran", "paymentStatus", paymentStatusOptionsHtml(s.paymentStatus)) +
          fieldFull("Catatan Tambahan", "notes", s.notes, false, true) +
        "</div>" +
        '<div style="margin-top:18px;"><label class="sans" style="display:block; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:9px;">Bukti Transfer</label>' +
        '<input type="file" id="proofImageInput" accept="image/*">' +
        '<div class="proof-upload-preview" id="proofPreviewWrap">' +
          (s.proofImage
            ? '<img class="proof-thumb" id="proofPreviewImg" src="' + s.proofImage + '">' +
              '<button type="button" class="icon-btn danger" id="removeProofBtn">Hapus Bukti</button>'
            : '<img class="proof-thumb" id="proofPreviewImg" src="" style="display:none;">') +
        "</div>" +
        "</div>" +
        '<div style="margin-top:18px;"><label class="sans" style="display:block; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:9px;">Menu Yang Keluar</label>' +
        '<div id="menuItemsWrap">' + menuItemsHtml + "</div>" +
        '<button type="button" class="icon-btn" id="addMenuItemRow" style="margin-top:6px;">+ Tambah Menu</button>' +
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

    function selectField(label, name, optionsHtml) {
      return (
        '<div class="form-field"><label>' + escapeHtml(label) + "</label>" +
        '<select name="' + name + '">' + optionsHtml + "</select>" +
        "</div>"
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

    function openForm(existing, prefillDate) {
      let menuRowCount = existing && existing.menuItems ? existing.menuItems.length : 1;
      let pendingProofImage = (existing && existing.proofImage) || "";
      openModal(formHtml(existing, prefillDate), function (modalEl) {
        modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
        const menuItemsWrap = modalEl.querySelector("#menuItemsWrap");

        const proofInput = modalEl.querySelector("#proofImageInput");
        const proofPreviewImg = modalEl.querySelector("#proofPreviewImg");
        const proofPreviewWrap = modalEl.querySelector("#proofPreviewWrap");

        function bindRemoveProofBtn() {
          const removeBtn = modalEl.querySelector("#removeProofBtn");
          if (removeBtn) {
            removeBtn.onclick = function () {
              pendingProofImage = "";
              proofPreviewImg.src = "";
              proofPreviewImg.style.display = "none";
              removeBtn.remove();
            };
          }
        }
        bindRemoveProofBtn();

        proofInput.addEventListener("change", function () {
          const file = proofInput.files && proofInput.files[0];
          if (!file) return;
          resizeImageToDataUrl(file, 1000, 0.75)
            .then(function (dataUrl) {
              pendingProofImage = dataUrl;
              proofPreviewImg.src = dataUrl;
              proofPreviewImg.style.display = "";
              if (!modalEl.querySelector("#removeProofBtn")) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "icon-btn danger";
                btn.id = "removeProofBtn";
                btn.textContent = "Hapus Bukti";
                proofPreviewWrap.appendChild(btn);
                bindRemoveProofBtn();
              }
            })
            .catch(function (err) {
              window.alert(err.message || "Gagal memproses gambar.");
            });
        });

        modalEl.querySelector("#addMenuItemRow").addEventListener("click", function () {
          const div = document.createElement("div");
          div.innerHTML = menuItemRowHtml(null, menuRowCount);
          menuItemsWrap.appendChild(div.firstChild);
          menuRowCount++;
          bindRemoveMenuButtons();
        });

        function bindRemoveMenuButtons() {
          menuItemsWrap.querySelectorAll("[data-remove-menu-row]").forEach(function (btn) {
            btn.onclick = function () {
              if (menuItemsWrap.children.length <= 1) return;
              btn.closest(".menu-item-block").remove();
            };
          });
        }
        bindRemoveMenuButtons();

        menuItemsWrap.addEventListener("change", function (e) {
          if (!e.target.classList.contains("menu-item-picker")) return;
          const val = e.target.value;
          if (!val || val === "__custom__") return;
          const name = val.split("|")[0];
          const block = e.target.closest(".menu-item-block");
          const nameInput = block.querySelector('input[name^="menu_name_"]');
          if (nameInput) nameInput.value = name;
        });

        modalEl.querySelector("#scheduleForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const fd = new FormData(e.target);
          const data = Object.fromEntries(fd.entries());

          const menuItems = [];
          menuItemsWrap.querySelectorAll(".menu-item-row").forEach(function (row) {
            const name = row.querySelector('input[name^="menu_name_"]').value;
            const qty = row.querySelector('input[name^="menu_qty_"]').value;
            if (name) menuItems.push({ name: name, qty: Number(qty) || 1 });
          });

          const payload = {
            date: data.date,
            brand: data.brand,
            client: data.client,
            departureTime: data.departureTime,
            standbyTime: data.standbyTime,
            staff: data.staff,
            location: data.location || "",
            contactChannel: data.contactChannel,
            paymentStatus: data.paymentStatus,
            proofImage: pendingProofImage,
            notes: data.notes || "",
            menuItems: menuItems,
          };

          let scheduleRecord;
          if (existing) {
            Object.assign(existing, payload);
            scheduleRecord = existing;
          } else {
            scheduleRecord = Object.assign({ id: uid("sch") }, payload);
            db.schedules.push(scheduleRecord);
          }
          syncInvoiceFromSchedule(db, scheduleRecord);
          saveDB(db);
          closeModal();
          selectedDate = payload.date;
          renderAll();
        });
      });
    }

    function openCombineForm(entries) {
      const eligible = entries.filter(function (s) { return !s.combinedInvoiceId; });
      if (eligible.length < 2) {
        window.alert("Pilih tanggal yang memiliki minimal 2 jadwal (brand berbeda) yang belum digabung untuk membuat satu invoice gabungan.");
        return;
      }
      const checkboxesHtml = eligible
        .map(function (s) {
          return (
            '<label style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px dashed var(--border); font-weight:400; font-size:13px;">' +
            '<input type="checkbox" name="combine_' + s.id + '" checked style="width:auto;">' +
            '<span style="width:10px; height:10px; border-radius:50%; background:' + brandColor(s.brand) + '; display:inline-block; flex-shrink:0;"></span>' +
            "<span>" + escapeHtml(brandName(s.brand)) + " — " + escapeHtml(s.client) + " (" + escapeHtml(scheduleMenuText(s)) + ")</span>" +
            "</label>"
          );
        })
        .join("");

      openModal(
        "<h3>Gabungkan Jadi 1 Invoice</h3>" +
        '<p class="modal-sub">Pilih minimal 2 jadwal yang ingin digabung jadi satu invoice — cocok saat satu client memesan beberapa brand sekaligus supaya tidak perlu mengirim invoice terpisah.</p>' +
        '<form id="combineForm">' +
        '<div style="margin-bottom:14px;">' + checkboxesHtml + "</div>" +
        '<div class="form-grid">' +
          field("Nama Client Pada Invoice", "client", "text", eligible[0].client, true) +
          field("Lokasi / Venue", "clientVenue", "text", eligible[0].location, false) +
          field("Tanggal Invoice", "date", "date", eligible[0].date, true) +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelCombineBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;">Buat Invoice Gabungan</button></div>' +
        "</form>",
        function (modalEl) {
          modalEl.querySelector("#cancelCombineBtn").addEventListener("click", closeModal);
          modalEl.querySelector("#combineForm").addEventListener("submit", function (e) {
            e.preventDefault();
            const fd = new FormData(e.target);
            const obj = Object.fromEntries(fd.entries());
            const selected = eligible.filter(function (s) { return fd.get("combine_" + s.id); });
            if (selected.length < 2) {
              window.alert("Pilih minimal 2 jadwal untuk digabung.");
              return;
            }
            createCombinedInvoiceFromSchedules(db, selected, {
              client: obj.client,
              clientVenue: obj.clientVenue,
              date: obj.date,
            });
            saveDB(db);
            closeModal();
            renderAll();
          });
        }
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
          (selectedDate ? "Belum ada jadwal pada tanggal ini." : "Belum ada jadwal tercatat.") +
          "</div></div>";

      const heading = selectedDate ? "Jadwal Tanggal " + formatDate(selectedDate) : "Semua Jadwal Brand";

      container.innerHTML =
        statCards() +
        calendarHtml() +
        '<div class="section-heading">' +
          '<div><h2>' + escapeHtml(heading) + '</h2><div class="sub">Klik tanggal di kalender untuk melihat/menambah jadwal brand pada hari itu</div></div>' +
          '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
          (canEdit && selectedDate && rows.length >= 2 ? '<button class="btn btn-ghost btn-sm" style="width:auto;" id="combineInvoiceBtn">Gabungkan Jadi 1 Invoice</button>' : "") +
          (canEdit ? '<button class="btn btn-sm" style="width:auto;" id="addScheduleBtn">+ Tambah Jadwal</button>' : "") +
          "</div>" +
        "</div>" +
        cardsHtml +
        (canEdit ? "" : '<div class="readonly-banner" style="margin-top:18px;">Akun Anda bersifat lihat-saja. Hubungi Administrator untuk menambah atau mengubah jadwal.</div>');

      const addBtn = container.querySelector("#addScheduleBtn");
      if (addBtn) addBtn.addEventListener("click", function () { openForm(null, selectedDate); });

      const combineBtn = container.querySelector("#combineInvoiceBtn");
      if (combineBtn) combineBtn.addEventListener("click", function () { openCombineForm(rows); });

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
      container.querySelectorAll("[data-view-proof]").forEach(function (img) {
        img.addEventListener("click", function () {
          viewProofImage(img.getAttribute("src"));
        });
      });
      container.querySelectorAll("[data-goto-invoice]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          window.location.hash = "#invoice";
        });
      });
    }

    renderAll();
  }

  return { render: render };
})();
