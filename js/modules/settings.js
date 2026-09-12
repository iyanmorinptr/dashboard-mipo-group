/* ===========================================================
   MODULE: Settings
   Manajemen akun staff (khusus admin) & ubah kata sandi sendiri.
   =========================================================== */

const SettingsModule = (function () {
  function render(container, ctx) {
    const db = loadDB();
    const isAdminUser = ctx.isAdmin;

    function roleBadge(role) {
      return role === "admin" ? '<span class="pill pill-gold">Administrator</span>' : '<span class="pill pill-grey">Staff</span>';
    }

    function userTableHtml() {
      const rows = db.users;
      const trs = rows
        .map(function (u) {
          return (
            "<tr><td><strong>" + escapeHtml(u.name) + "</strong></td>" +
            "<td>" + escapeHtml(u.email) + "</td>" +
            "<td>" + roleBadge(u.role) + "</td>" +
            "<td><div class=\"row-actions\">" +
              '<button class="icon-btn" data-edit="' + u.id + '">Edit</button>' +
              (u.id !== ctx.session.id ? '<button class="icon-btn danger" data-del="' + u.id + '">Hapus</button>' : "") +
            "</div></td></tr>"
          );
        })
        .join("");
      return (
        '<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Aksi</th></tr></thead><tbody>' +
        trs +
        "</tbody></table></div>"
      );
    }

    function userFormHtml(existing) {
      const u = existing || { name: "", email: "", password: "", role: "staff" };
      return (
        "<h3>" + (existing ? "Edit Akun Staff" : "Tambah Akun Staff") + "</h3>" +
        '<p class="modal-sub">Akun ini digunakan staff untuk login ke dashboard.</p>' +
        '<form id="userForm"><div class="form-grid">' +
        '<div class="form-field full"><label>Nama Lengkap</label><input type="text" name="name" value="' + escapeHtml(u.name) + '" required></div>' +
        '<div class="form-field full"><label>Email</label><input type="email" name="email" value="' + escapeHtml(u.email) + '" required></div>' +
        '<div class="form-field"><label>Kata Sandi' + (existing ? " (kosongkan jika tidak diubah)" : "") + "</label><input type=\"text\" name=\"password\" value=\"" + (existing ? "" : escapeHtml(u.password)) + '" ' + (existing ? "" : "required") + "></div>" +
        '<div class="form-field"><label>Peran</label><select name="role">' +
          '<option value="staff"' + (u.role === "staff" ? " selected" : "") + '>Staff</option>' +
          '<option value="admin"' + (u.role === "admin" ? " selected" : "") + '>Administrator</option>' +
        "</select></div>" +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;">Simpan</button></div>' +
        "</form>"
      );
    }

    function openUserForm(existing) {
      openModal(userFormHtml(existing), function (modalEl) {
        modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
        modalEl.querySelector("#userForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.target).entries());
          if (existing) {
            existing.name = data.name;
            existing.email = data.email;
            existing.role = data.role;
            if (data.password) existing.password = data.password;
          } else {
            db.users.push({ id: uid("usr"), name: data.name, email: data.email, password: data.password, role: data.role });
          }
          saveDB(db);
          closeModal();
          renderAll();
        });
      });
    }

    function myProfileCard() {
      const me = db.users.find((u) => u.id === ctx.session.id);
      if (!me) return "";
      return (
        '<div class="card" style="margin-bottom:26px; max-width:480px;">' +
        '<div class="label sans" style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Profil Saya</div>' +
        '<div style="font-size:17px; margin-bottom:4px;">' + escapeHtml(me.name) + "</div>" +
        '<div class="sans" style="font-size:13px; color:var(--muted); margin-bottom:16px;">' + escapeHtml(me.email) + " &middot; " + (me.role === "admin" ? "Administrator" : "Staff") + "</div>" +
        '<button class="btn btn-outline btn-sm" style="width:auto;" id="changePwBtn">Ubah Kata Sandi</button>' +
        "</div>"
      );
    }

    function openChangePassword() {
      const me = db.users.find((u) => u.id === ctx.session.id);
      openModal(
        "<h3>Ubah Kata Sandi</h3>" +
        '<p class="modal-sub">Masukkan kata sandi baru untuk akun Anda.</p>' +
        '<form id="pwForm"><div class="form-grid">' +
        '<div class="form-field full"><label>Kata Sandi Baru</label><input type="password" name="password" required minlength="4"></div>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;">Simpan</button></div>' +
        "</form>",
        function (modalEl) {
          modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
          modalEl.querySelector("#pwForm").addEventListener("submit", function (e) {
            e.preventDefault();
            me.password = new FormData(e.target).get("password");
            saveDB(db);
            closeModal();
            window.alert("Kata sandi berhasil diperbarui.");
          });
        }
      );
    }

    function renderAll() {
      let html = myProfileCard();

      if (isAdminUser) {
        html +=
          '<div class="section-heading"><div><h2>Manajemen Akun Staff</h2><div class="sub">Kelola siapa saja yang dapat mengakses dashboard</div></div>' +
          '<button class="btn btn-sm" style="width:auto;" id="addUserBtn">+ Tambah Staff</button>' +
          "</div>" +
          userTableHtml();
      } else {
        html += '<div class="readonly-banner">Hanya Administrator yang dapat mengelola akun staff lainnya.</div>';
      }

      container.innerHTML = html;

      const pwBtn = container.querySelector("#changePwBtn");
      if (pwBtn) pwBtn.addEventListener("click", openChangePassword);

      const addUserBtn = container.querySelector("#addUserBtn");
      if (addUserBtn) addUserBtn.addEventListener("click", function () { openUserForm(null); });

      container.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () { openUserForm(db.users.find((u) => u.id === btn.dataset.edit)); });
      });
      container.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirmAction("Hapus akun staff ini?")) return;
          db.users = db.users.filter((u) => u.id !== btn.dataset.del);
          saveDB(db);
          renderAll();
        });
      });
    }

    renderAll();
  }

  return { render: render };
})();
