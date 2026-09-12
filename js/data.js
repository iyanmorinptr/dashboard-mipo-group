/* ===========================================================
   MIPO GROUP DASHBOARD — data layer (Firebase Firestore + Auth)
   Seluruh data disimpan di satu dokumen Firestore (mipo/app) dan
   disinkronkan real-time ke semua perangkat. Login memakai
   Firebase Authentication (email/password) — bukan lagi
   dicocokkan manual di sini.
   =========================================================== */

const DB_COLLECTION = "mipo";
const DB_DOC_ID = "app";

function uid(prefix) {
  return (prefix ? prefix + "-" : "") + Math.random().toString(36).slice(2, 9);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function seedDB() {
  return {
    users: [
      {
        id: uid("usr"),
        name: "Admin Mipo",
        email: "iyanmorinptr@gmail.com",
        role: "admin", // admin = akses penuh, staff = terbatas. Password dikelola Firebase Authentication, bukan di sini.
      },
    ],
    schedules: [
      {
        id: uid("sch"),
        date: todayISO(),
        client: "PT Sinar Abadi",
        menuItems: [
          { name: "Koneo Vanilla Based - 100 Portions", qty: 1 },
          { name: "Warmiepo Indomie (per pax)", qty: 100 },
        ],
        departureTime: "06:30",
        standbyTime: "08:00",
        staff: "Rangga, Dewi",
        location: "Ballroom Hotel Mulia, Jakarta",
        notes: "Setup 1 jam sebelum acara dimulai",
      },
    ],
    finance: [],
    invoices: [],
    inventory: [],
    maintenance: [],
    companyInfo: {
      bankName: "Nama Bank",
      accountName: "Nama Pemilik Rekening",
      accountNumber: "0000000000",
      paymentNote: "Please make payment 7 days before the day",
    },
  };
}

function migrateDB(db) {
  // Menambahkan field baru pada data lama supaya versi dashboard
  // yang lebih baru tidak error terhadap data yang sudah ada.
  db.users = db.users || [];
  db.schedules = db.schedules || [];
  db.finance = db.finance || [];
  db.invoices = db.invoices || [];
  db.inventory = db.inventory || [];
  db.maintenance = db.maintenance || [];
  if (!db.companyInfo) {
    db.companyInfo = {
      bankName: "Nama Bank",
      accountName: "Nama Pemilik Rekening",
      accountNumber: "0000000000",
      paymentNote: "Please make payment 7 days before the day",
    };
  }
  db.invoices.forEach(function (inv) {
    if (inv.clientPhone === undefined) inv.clientPhone = "";
    if (inv.clientVenue === undefined) inv.clientVenue = "";
    if (inv.dpPercent === undefined) inv.dpPercent = 50;
  });
  db.schedules.forEach(function (s) {
    // Data lama menyimpan menu sebagai satu string bebas ("menu"); versi
    // baru menyimpan rincian item terpilih dari pricelist ("menuItems").
    if (!s.menuItems) {
      s.menuItems = s.menu ? [{ name: s.menu, qty: 1 }] : [];
    }
  });
  return db;
}

function scheduleMenuText(s) {
  if (s.menuItems && s.menuItems.length) {
    return s.menuItems
      .map(function (mi) {
        const qty = Number(mi.qty) || 1;
        return mi.name + (qty > 1 ? " x" + qty : "");
      })
      .join(", ");
  }
  return s.menu || "-";
}

/* ---------- Firestore-backed data store ---------- */
let _cachedDB = null;
let _dbInitStarted = false;
let _firstSnapshotHandled = false;
let _dbReadyResolve, _dbReadyReject;
const _dbReadyPromise = new Promise(function (resolve, reject) {
  _dbReadyResolve = resolve;
  _dbReadyReject = reject;
});

function _dbRef() {
  return firestore.collection(DB_COLLECTION).doc(DB_DOC_ID);
}

function initDB() {
  if (_dbInitStarted) return;
  _dbInitStarted = true;
  _dbRef().onSnapshot(
    function (snap) {
      if (!snap.exists) {
        const seeded = seedDB();
        _cachedDB = seeded;
        _dbRef()
          .set(seeded)
          .catch(function (e) {
            console.error("Gagal membuat data awal di Firestore:", e);
          });
      } else {
        _cachedDB = migrateDB(snap.data());
      }
      if (!_firstSnapshotHandled) {
        _firstSnapshotHandled = true;
        _dbReadyResolve();
      } else if (typeof window.__onRemoteDBChange === "function") {
        window.__onRemoteDBChange();
      }
    },
    function (err) {
      // PENTING: jangan pernah diam-diam lanjut dengan data kosong/seed di sini —
      // itu yang menyebabkan data asli tertimpa data contoh saat penyimpanan
      // berikutnya. Kegagalan harus gagal-total & terlihat, bukan sunyi.
      console.error("Gagal memuat data dashboard dari Firestore:", err);
      if (!_firstSnapshotHandled) {
        _firstSnapshotHandled = true;
        _dbReadyReject(err);
      }
    }
  );
}

function whenDBReady() {
  initDB();
  return _dbReadyPromise;
}

function loadDB() {
  if (!_cachedDB) {
    throw new Error("Data belum siap dimuat dari server — jangan menyimpan perubahan dalam kondisi ini.");
  }
  return _cachedDB;
}

function saveDB(db) {
  // Lapisan pengaman: tolak menyimpan objek yang tidak lengkap/rusak,
  // supaya bug apa pun di kode tidak bisa menimpa data asli di Firestore.
  const requiredArrays = ["users", "schedules", "finance", "invoices", "inventory", "maintenance"];
  const looksValid = db && requiredArrays.every(function (key) { return Array.isArray(db[key]); });
  if (!looksValid) {
    console.error("saveDB dipanggil dengan data yang tidak valid, penyimpanan dibatalkan:", db);
    window.alert("Terjadi kesalahan internal — perubahan TIDAK disimpan supaya data lama tidak hilang. Muat ulang halaman lalu coba lagi.");
    return;
  }
  _cachedDB = db;
  _dbRef()
    .set(db)
    .catch(function (e) {
      console.error("Gagal menyimpan data ke Firestore:", e);
      window.alert("Gagal menyimpan perubahan ke server. Periksa koneksi internet kamu, lalu coba lagi.");
    });
}

/* ---------- Authentication / session ---------- */
let _sessionCache = null;

function getSession() {
  return _sessionCache;
}

function isAdmin() {
  return !!_sessionCache && _sessionCache.role === "admin";
}

function clearSession() {
  _sessionCache = null;
  return auth.signOut();
}

function buildSessionFromAuthUser(user) {
  if (!user) {
    _sessionCache = null;
    return null;
  }
  const db = loadDB();
  const match = (db.users || []).find(function (u) {
    return (u.email || "").toLowerCase() === user.email.toLowerCase();
  });
  if (!match) {
    _sessionCache = null;
    return null;
  }
  _sessionCache = { id: match.id, name: match.name, email: match.email, role: match.role };
  return _sessionCache;
}

function getInitialAuthUser() {
  return new Promise(function (resolve) {
    const unsub = auth.onAuthStateChanged(function (user) {
      unsub();
      resolve(user);
    });
  });
}

function mapAuthError(err) {
  const code = err && err.code;
  const map = {
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-disabled": "Akun ini telah dinonaktifkan.",
    "auth/user-not-found": "Email atau kata sandi salah. Silakan coba lagi.",
    "auth/wrong-password": "Email atau kata sandi salah. Silakan coba lagi.",
    "auth/invalid-credential": "Email atau kata sandi salah. Silakan coba lagi.",
    "auth/too-many-requests": "Terlalu banyak percobaan gagal. Coba lagi beberapa saat lagi.",
    "auth/network-request-failed": "Tidak ada koneksi internet. Periksa jaringan kamu.",
    "auth/requires-recent-login": "Sesi login sudah lama. Silakan keluar dan masuk kembali sebelum mengubah kata sandi.",
    "auth/email-already-in-use": "Email ini sudah terdaftar.",
    "auth/weak-password": "Kata sandi terlalu pendek (minimal 6 karakter).",
  };
  return map[code] || "Terjadi kesalahan. Silakan coba lagi.";
}

/* ---------- formatting helpers ---------- */
function formatIDR(n) {
  const v = Number(n) || 0;
  return "Rp " + v.toLocaleString("id-ID");
}

function formatNumberID(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("id-ID");
}

function formatInvoiceDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function invoiceTotal(inv) {
  return (inv.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
}
