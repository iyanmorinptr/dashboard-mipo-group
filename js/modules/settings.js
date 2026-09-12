/* ===========================================================
   MODULE: Settings
   Manajemen akun staff (khusus admin) & ubah kata sandi sendiri.
   Login sungguhan dikelola Firebase Authentication — menu ini
   hanya mengatur nama/peran staff (di Firestore) dan membuat/
   mencabut akses. Password akun baru dibuat langsung di Firebase
   Authentication lewat instance app kedua, supaya admin yang
   sedang login tidak ikut ter-logout.
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
      const u = existing || { name: "", email: "", role: "staff" };
      return (
        "<h3>" + (existing ? "Edit Akun Staff" : "Tambah Akun Staff") + "</h3>" +
        '<p class="modal-sub">' +
          (existing
            ? "Email tidak bisa diubah di sini. Untuk ubah password, minta staff bersangkutan memakai menu \"Ubah Kata Sandi\" di akunnya sendiri."
            : "Akun login akan langsung dibuat di Firebase Authentication.") +
        "</p>" +
        '<div id="userFormError" class="login-error" style="display:none; margin-bottom:16px;"></div>' +
        '<form id="userForm"><div class="form-grid">' +
        '<div class="form-field full"><label>Nama Lengkap</label><input type="text" name="name" value="' + escapeHtml(u.name) + '" required></div>' +
        '<div class="form-field full"><label>Email</label><input type="email" name="email" value="' + escapeHtml(u.email) + '" ' + (existing ? "readonly" : "required") + "></div>" +
        (existing
          ? ""
          : '<div class="form-field full"><label>Kata Sandi Awal</label><input type="text" name="password" required minlength="6" placeholder="minimal 6 karakter"></div>') +
        '<div class="form-field"><label>Peran</label><select name="role">' +
          '<option value="staff"' + (u.role === "staff" ? " selected" : "") + '>Staff</option>' +
          '<option value="admin"' + (u.role === "admin" ? " selected" : "") + '>Administrator</option>' +
        "</select></div>" +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;" id="userFormSubmitBtn">Simpan</button></div>' +
        "</form>"
      );
    }

    function createStaffAuthAccount(email, password) {
      // Pakai instance Firebase app kedua supaya admin yang sedang login
      // tidak ikut ter-logout saat akun staff baru dibuat.
      const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary-" + Date.now());
      const secondaryAuth = secondaryApp.auth();
      return secondaryAuth
        .createUserWithEmailAndPassword(email, password)
        .then(function () {
          return secondaryAuth.signOut();
        })
        .then(function () {
          return secondaryApp.delete();
        });
    }

    function openUserForm(existing) {
      openModal(userFormHtml(existing), function (modalEl) {
        modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
        const errorBox = modalEl.querySelector("#userFormError");
        const submitBtn = modalEl.querySelector("#userFormSubmitBtn");

        modalEl.querySelector("#userForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.target).entries());
          errorBox.style.display = "none";

          if (existing) {
            existing.name = data.name;
            existing.role = data.role;
            saveDB(db);
            closeModal();
            renderAll();
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = "Membuat akun...";
          createStaffAuthAccount(data.email, data.password)
            .then(function () {
              db.users.push({ id: uid("usr"), name: data.name, email: data.email, role: data.role });
              saveDB(db);
              closeModal();
              renderAll();
            })
            .catch(function (err) {
              errorBox.textContent = mapAuthError(err);
              errorBox.style.display = "block";
              submitBtn.disabled = false;
              submitBtn.textContent = "Simpan";
            });
        });
      });
    }

    function companyInfoCard() {
      const ci = db.companyInfo || {};
      return (
        '<div class="card" style="margin-bottom:26px; max-width:480px;">' +
        '<div class="label sans" style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Info Pembayaran (tampil di Invoice)</div>' +
        '<div style="font-size:14px; line-height:1.8; margin-bottom:16px;">' +
          escapeHtml(ci.bankName || "-") + "<br>" +
          "Account Name: " + escapeHtml(ci.accountName || "-") + "<br>" +
          "Account No.: " + escapeHtml(ci.accountNumber || "-") + "<br>" +
          '<span style="color:var(--muted); font-size:12.5px;">' + escapeHtml(ci.paymentNote || "") + "</span>" +
        "</div>" +
        '<button class="btn btn-outline btn-sm" style="width:auto;" id="editCompanyInfoBtn">Ubah Info Pembayaran</button>' +
        "</div>"
      );
    }

    function openCompanyInfoForm() {
      const ci = db.companyInfo || {};
      openModal(
        "<h3>Info Pembayaran</h3>" +
        '<p class="modal-sub">Informasi ini tampil di setiap invoice yang dibuat, tersinkron ke semua perangkat.</p>' +
        '<form id="companyInfoForm"><div class="form-grid">' +
        '<div class="form-field full"><label>Nama Bank</label><input type="text" name="bankName" value="' + escapeHtml(ci.bankName || "") + '" required></div>' +
        '<div class="form-field full"><label>Nama Pemilik Rekening</label><input type="text" name="accountName" value="' + escapeHtml(ci.accountName || "") + '" required></div>' +
        '<div class="form-field full"><label>Nomor Rekening</label><input type="text" name="accountNumber" value="' + escapeHtml(ci.accountNumber || "") + '" required></div>' +
        '<div class="form-field full"><label>Catatan Pembayaran</label><input type="text" name="paymentNote" value="' + escapeHtml(ci.paymentNote || "") + '"></div>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;">Simpan</button></div>' +
        "</form>",
        function (modalEl) {
          modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
          modalEl.querySelector("#companyInfoForm").addEventListener("submit", function (e) {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            db.companyInfo = data;
            saveDB(db);
            closeModal();
            renderAll();
          });
        }
      );
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
      openModal(
        "<h3>Ubah Kata Sandi</h3>" +
        '<p class="modal-sub">Masukkan kata sandi baru untuk akun Anda.</p>' +
        '<div id="pwFormError" class="login-error" style="display:none; margin-bottom:16px;"></div>' +
        '<form id="pwForm"><div class="form-grid">' +
        '<div class="form-field full"><label>Kata Sandi Baru</label><input type="password" name="password" required minlength="6"></div>' +
        "</div>" +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" id="cancelBtn">Batal</button><button type="submit" class="btn btn-sm" style="width:auto;" id="pwSubmitBtn">Simpan</button></div>' +
        "</form>",
        function (modalEl) {
          modalEl.querySelector("#cancelBtn").addEventListener("click", closeModal);
          const errorBox = modalEl.querySelector("#pwFormError");
          const submitBtn = modalEl.querySelector("#pwSubmitBtn");
          modalEl.querySelector("#pwForm").addEventListener("submit", function (e) {
            e.preventDefault();
            const newPassword = new FormData(e.target).get("password");
            submitBtn.disabled = true;
            submitBtn.textContent = "Menyimpan...";
            auth.currentUser
              .updatePassword(newPassword)
              .then(function () {
                closeModal();
                window.alert("Kata sandi berhasil diperbarui.");
              })
              .catch(function (err) {
                errorBox.textContent = mapAuthError(err);
                errorBox.style.display = "block";
                submitBtn.disabled = false;
                submitBtn.textContent = "Simpan";
              });
          });
        }
      );
    }

    function renderAll() {
      let html = myProfileCard();

      if (isAdminUser) {
        html += companyInfoCard();
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

      const editCompanyInfoBtn = container.querySelector("#editCompanyInfoBtn");
      if (editCompanyInfoBtn) editCompanyInfoBtn.addEventListener("click", openCompanyInfoForm);

      const addUserBtn = container.querySelector("#addUserBtn");
      if (addUserBtn) addUserBtn.addEventListener("click", function () { openUserForm(null); });

      container.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () { openUserForm(db.users.find((u) => u.id === btn.dataset.edit)); });
      });
      container.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirmAction("Hapus akun staff ini dari dashboard? Orang ini tidak akan bisa masuk lagi, tapi akun login Firebase-nya tidak otomatis terhapus (bisa dihapus manual lewat Firebase Console bila perlu).")) return;
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
