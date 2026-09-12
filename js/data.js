/* ===========================================================
   MIPO GROUP DASHBOARD — data layer (localStorage)
   Ganti modul ini dengan panggilan API/database sungguhan
   kapan pun backend sudah siap; bentuk data di bawah sengaja
   dibuat sederhana supaya migrasinya mudah.
   =========================================================== */

const DB_KEY = "mipo_dashboard_db_v1";
const SESSION_KEY = "mipo_dashboard_session_v1";

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
        email: "admin@mipogroup.com",
        password: "admin123",
        role: "admin", // admin = akses penuh, staff = terbatas
      },
      {
        id: uid("usr"),
        name: "Staff Operasional",
        email: "staff@mipogroup.com",
        password: "staff123",
        role: "staff",
      },
    ],
    schedules: [
      {
        id: uid("sch"),
        date: todayISO(),
        client: "PT Sinar Abadi",
        menu: "Nasi Box Premium, Snack Box, Coffee Break",
        departureTime: "06:30",
        standbyTime: "08:00",
        staff: "Rangga, Dewi",
        location: "Ballroom Hotel Mulia, Jakarta",
        notes: "Setup 1 jam sebelum acara dimulai",
      },
      {
        id: uid("sch"),
        date: todayISO(),
        client: "Yayasan Harapan Bangsa",
        menu: "Prasmanan Nusantara, Dessert Table",
        departureTime: "09:00",
        standbyTime: "10:30",
        staff: "Fajar, Nita, Bagus",
        location: "Gedung Serbaguna, Bekasi",
        notes: "Bawa dekorasi tambahan sesuai request klien",
      },
    ],
    finance: [
      {
        id: uid("fin"),
        date: todayISO(),
        type: "in",
        category: "Pemasukan Jasa",
        description: "Pembayaran termin 1 - PT Sinar Abadi",
        amount: 15000000,
        ref: "",
      },
      {
        id: uid("fin"),
        date: todayISO(),
        type: "out",
        category: "Operasional",
        description: "Belanja bahan baku catering",
        amount: 4500000,
        ref: "",
      },
    ],
    invoices: [
      {
        id: uid("inv"),
        number: "INV/2026/09/001",
        client: "PT Sinar Abadi",
        clientPhone: "021-5551234",
        clientVenue: "Ballroom Hotel Mulia, Jakarta",
        transaction: "Layanan Catering Acara Korporat",
        date: todayISO(),
        dpPercent: 50,
        items: [
          { desc: "Nasi Box Premium (200 pax)", qty: 200, price: 45000 },
          { desc: "Coffee Break", qty: 200, price: 15000 },
        ],
        status: "unpaid",
      },
    ],
    inventory: [
      {
        id: uid("ivt"),
        name: "Chafing Dish Stainless",
        category: "Peralatan Saji",
        qty: 40,
        condition: "Baik",
        location: "Gudang Utama",
      },
      {
        id: uid("ivt"),
        name: "Tenda Sarnafil 5x5",
        category: "Perlengkapan Event",
        qty: 8,
        condition: "Baik",
        location: "Gudang Cabang",
      },
      {
        id: uid("ivt"),
        name: "Mobil Box Delivery",
        category: "Kendaraan Operasional",
        qty: 2,
        condition: "Perlu Servis",
        location: "Pool Kendaraan",
      },
    ],
    maintenance: [
      {
        id: uid("mnt"),
        itemName: "Mobil Box Delivery (B 1234 XYZ)",
        type: "perawatan",
        dueDate: todayISO(),
        cost: 1200000,
        status: "terjadwal",
        notes: "Servis rutin 10.000 km",
      },
      {
        id: uid("mnt"),
        itemName: "Mobil Box Delivery (B 1234 XYZ)",
        type: "pajak",
        dueDate: todayISO(),
        cost: 850000,
        status: "belum dibayar",
        notes: "Pajak tahunan STNK",
      },
    ],
    companyInfo: {
      bankName: "Nama Bank",
      accountName: "Nama Pemilik Rekening",
      accountNumber: "0000000000",
      paymentNote: "Please make payment 7 days before the day",
    },
  };
}

function migrateDB(db) {
  // Menambahkan field baru pada data lama yang tersimpan di browser
  // supaya versi dashboard yang lebih baru tidak error.
  if (!db.companyInfo) {
    db.companyInfo = {
      bankName: "Nama Bank",
      accountName: "Nama Pemilik Rekening",
      accountNumber: "0000000000",
      paymentNote: "Please make payment 7 days before the day",
    };
  }
  (db.invoices || []).forEach(function (inv) {
    if (inv.clientPhone === undefined) inv.clientPhone = "";
    if (inv.clientVenue === undefined) inv.clientVenue = "";
    if (inv.dpPercent === undefined) inv.dpPercent = 50;
  });
  return db;
}

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const seeded = seedDB();
    localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return migrateDB(JSON.parse(raw));
  } catch (e) {
    const seeded = seedDB();
    localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/* ---------- session ---------- */
function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function setSession(user) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role })
  );
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function isAdmin() {
  const s = getSession();
  return !!s && s.role === "admin";
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
