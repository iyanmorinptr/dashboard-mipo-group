/* ===========================================================
   MIPO GROUP — Konfigurasi brand & kanal kontak untuk Schedule.
   Warna di sini dipakai untuk kalender (supaya langsung kelihatan
   brand apa saja yang jalan di tanggal tertentu).
   =========================================================== */

const BRANDS = [
  { id: "koneo", name: "Koneo Goes To", color: "#162a4d" }, // biru dongker
  { id: "runna", name: "Runna Kitchen", color: "#e07b28" }, // orange
  { id: "kadakadi", name: "Kada-Kadi", color: "#7a1f2b" }, // merah maroon
  { id: "warmiepo", name: "Warmiepo", color: "#22c55e" }, // hijau terang
];

const CONTACT_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "threads", label: "Threads" },
  { id: "instagram", label: "Instagram" },
];

function brandById(id) {
  return BRANDS.find(function (b) { return b.id === id; }) || null;
}
function brandColor(id) {
  const b = brandById(id);
  return b ? b.color : "#8a8375";
}
function brandName(id) {
  const b = brandById(id);
  return b ? b.name : "Brand Lain";
}
function channelLabel(id) {
  const c = CONTACT_CHANNELS.find(function (x) { return x.id === id; });
  return c ? c.label : "-";
}

const PAYMENT_STATUSES = [
  { id: "unpaid", label: "Belum Bayar", pillClass: "pill-grey" },
  { id: "dp50", label: "DP 50%", pillClass: "pill-blue" },
  { id: "paid", label: "Lunas", pillClass: "pill-gold" },
];

function paymentStatusInfo(id) {
  return PAYMENT_STATUSES.find(function (p) { return p.id === id; }) || PAYMENT_STATUSES[0];
}
