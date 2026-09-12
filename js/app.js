/* ===========================================================
   MIPO GROUP DASHBOARD — shell / router
   =========================================================== */

(function () {
  const ICONS = {
    home:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
    schedule:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    finance:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 17l5-5 4 3 7-8"/><path d="M14 6h5v5"/></svg>',
    invoice:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h9l4 4v14H6z"/><path d="M9 9h7M9 13h7M9 17h4"/></svg>',
    inventory:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg>',
    maintenance:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3l3 3-8 8-4 1 1-4 8-8z"/><path d="M4 21l4-1"/></svg>',
    settings:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.2-1.6l2-1.6-2-3.4-2.4.7a7 7 0 00-1.4-.8L14.6 3H9.4l-.4 2.3a7 7 0 00-1.4.8l-2.4-.7-2 3.4 2 1.6A7 7 0 005 12c0 .5.07 1 .2 1.6l-2 1.6 2 3.4 2.4-.7c.4.3.9.6 1.4.8l.4 2.3h5.2l.4-2.3c.5-.2 1-.5 1.4-.8l2.4.7 2-3.4-2-1.6c.13-.6.2-1.1.2-1.6z"/></svg>',
  };

  const ROUTES = [
    { key: "home", label: "Home", title: "Home", subtitle: "Jadwal client beserta detail lengkapnya", module: HomeModule },
    { key: "schedule", label: "Schedule", title: "Schedule", subtitle: "Kelola & edit jadwal client", module: ScheduleModule },
    { key: "finance", label: "Finance", title: "Finance", subtitle: "Kas, pemasukan, pengeluaran, omset & profit perusahaan", module: FinanceModule },
    { key: "invoice", label: "Invoice", title: "Invoice", subtitle: "Pembuatan invoice & rekapan transaksi", module: InvoiceModule },
    { key: "inventory", label: "Inventory", title: "Inventory", subtitle: "Peralatan & perlengkapan milik perusahaan", module: InventoryModule },
    { key: "maintenance", label: "Maintenance", title: "Maintenance", subtitle: "Jadwal perawatan & pembayaran pajak aset", module: MaintenanceModule },
    { key: "settings", label: "Settings", title: "Settings", subtitle: "Pengaturan akun & manajemen staff", module: SettingsModule },
  ];

  const sidebarNav = document.getElementById("sidebarNav");
  const contentEl = document.getElementById("content");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const loadingOverlay = document.getElementById("loadingOverlay");

  let session = null;
  let appStarted = false;

  function closeSidebar() {
    // Di layar lebar sidebar tetap terbuka; ini hanya menutup overlay/drawer di HP.
    if (window.innerWidth <= 860) sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }

  function currentRouteKey() {
    const hash = (window.location.hash || "#home").replace("#", "");
    return ROUTES.some((r) => r.key === hash) ? hash : "home";
  }

  function render() {
    const key = currentRouteKey();
    const route = ROUTES.find((r) => r.key === key);

    document.querySelectorAll(".nav-item").forEach(function (el) {
      el.classList.toggle("active", el.dataset.key === key);
    });

    pageTitle.textContent = route.title;
    pageSubtitle.textContent = route.subtitle;

    contentEl.innerHTML = "";
    if (route.module && typeof route.module.render === "function") {
      route.module.render(contentEl, { session: session, isAdmin: isAdmin() });
    } else {
      contentEl.innerHTML = '<div class="empty-state">Modul belum tersedia.</div>';
    }

    closeSidebar();
    window.scrollTo(0, 0);
  }

  function startApp(activeSession) {
    session = activeSession;

    document.getElementById("userAvatar").textContent = (session.name || "?").charAt(0).toUpperCase();
    document.getElementById("userName").textContent = session.name;
    document.getElementById("userRole").textContent = session.role === "admin" ? "Administrator" : "Staff";

    document.getElementById("logoutBtn").addEventListener("click", function () {
      clearSession().then(function () {
        window.location.href = "index.html";
      });
    });

    ROUTES.forEach(function (r) {
      const a = document.createElement("a");
      a.href = "#" + r.key;
      a.className = "nav-item";
      a.dataset.key = r.key;
      a.innerHTML = '<span class="nav-icon">' + ICONS[r.key] + '</span><span>' + r.label + '</span>';
      sidebarNav.appendChild(a);
    });

    function syncSidebarForWidth() {
      // Di layar lebar (laptop) sidebar terbuka secara default; di layar
      // sempit (HP) sidebar tertutup secara default dan tampil sebagai overlay.
      if (window.innerWidth > 860) {
        sidebar.classList.add("open");
        overlay.classList.remove("show");
      } else {
        sidebar.classList.remove("open");
      }
    }
    syncSidebarForWidth();
    window.addEventListener("resize", syncSidebarForWidth);

    hamburgerBtn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      if (window.innerWidth <= 860) overlay.classList.toggle("show");
    });
    overlay.addEventListener("click", closeSidebar);

    window.addEventListener("hashchange", render);
    window.__onRemoteDBChange = function () {
      if (appStarted) render();
    };

    loadingOverlay.style.display = "none";
    appStarted = true;
    render();
  }

  function showFatalError(message) {
    loadingOverlay.innerHTML =
      '<div style="max-width:360px; text-align:center; padding:24px;">' +
      '<div style="font-weight:700; margin-bottom:10px;">Gagal memuat dashboard</div>' +
      '<div style="margin-bottom:18px;">' + escapeHtml(message) + "</div>" +
      '<button id="reloadBtn" style="border:1px solid #1d1d1f; background:#1d1d1f; color:#fff; border-radius:980px; padding:10px 20px; cursor:pointer;">Muat Ulang</button>' +
      "</div>";
    loadingOverlay.style.display = "flex";
    const reloadBtn = document.getElementById("reloadBtn");
    if (reloadBtn) reloadBtn.addEventListener("click", function () { window.location.reload(); });
  }

  window.addEventListener("error", function (e) {
    if (!appStarted) showFatalError((e && e.message) || "Terjadi kesalahan tak terduga.");
  });
  window.addEventListener("unhandledrejection", function (e) {
    if (!appStarted) {
      const reason = e && e.reason;
      showFatalError((reason && (reason.message || String(reason))) || "Terjadi kesalahan tak terduga.");
    }
  });

  Promise.all([whenDBReady(), getInitialAuthUser()])
    .then(function (results) {
      const user = results[1];
      if (!user) {
        window.location.href = "index.html";
        return;
      }
      const activeSession = buildSessionFromAuthUser(user);
      if (!activeSession) {
        // Login Firebase valid, tapi akunnya tidak/tidak lagi terdaftar sebagai staff.
        auth.signOut().then(function () {
          window.location.href = "index.html";
        });
        return;
      }
      startApp(activeSession);
    })
    .catch(function (err) {
      console.error(err);
      showFatalError((err && err.message) || "Terjadi kesalahan tak terduga.");
    });

  // Kalau sesi login berakhir (logout dari tab lain, dsb) saat aplikasi sudah berjalan.
  auth.onAuthStateChanged(function (user) {
    if (!user && appStarted) {
      window.location.href = "index.html";
    }
  });
})();
