/* ===========================================================
   MIPO GROUP — Pricelist resmi (Koneo Goes To, Runna Kitchen,
   Warmiepo). Dipakai di form Invoice supaya staff tinggal pilih
   item, tidak perlu mengetik deskripsi & harga secara manual.
   Admin bisa memperbarui daftar ini kapan pun harga berubah.
   =========================================================== */

const PRICELIST = [
  {
    category: "Koneo Goes To - Vanilla Based",
    items: [
      { name: "Koneo Vanilla Based - 100 Portions", price: 2500000 },
      { name: "Koneo Vanilla Based - 200 Portions", price: 4800000 },
      { name: "Koneo Vanilla Based - 300 Portions", price: 6900000 },
      { name: "Koneo Vanilla Based - 400 Portions", price: 8800000 },
      { name: "Koneo Vanilla Based - 500 Portions", price: 10500000 },
      { name: "Koneo Vanilla Based - 600 Portions", price: 12000000 },
    ],
  },
  {
    category: "Koneo Goes To - Non Vanilla Based",
    items: [
      { name: "Koneo Non Vanilla Based - 100 Portions", price: 2800000 },
      { name: "Koneo Non Vanilla Based - 200 Portions", price: 5400000 },
      { name: "Koneo Non Vanilla Based - 300 Portions", price: 7800000 },
      { name: "Koneo Non Vanilla Based - 400 Portions", price: 10000000 },
      { name: "Koneo Non Vanilla Based - 500 Portions", price: 12000000 },
      { name: "Koneo Non Vanilla Based - 600 Portions", price: 13800000 },
    ],
  },
  {
    category: "Koneo Goes To - Mix Based (50:50)",
    items: [
      { name: "Koneo Mix Based - 100 Portions", price: 2650000 },
      { name: "Koneo Mix Based - 200 Portions", price: 5100000 },
      { name: "Koneo Mix Based - 300 Portions", price: 7350000 },
      { name: "Koneo Mix Based - 400 Portions", price: 9400000 },
      { name: "Koneo Mix Based - 500 Portions", price: 11250000 },
      { name: "Koneo Mix Based - 600 Portions", price: 12900000 },
    ],
  },
  {
    category: "Runna Kitchen - Dimsum Mentai",
    items: [
      { name: "Runna Dimsum Mentai - 150 pcs", price: 1125000 },
      { name: "Runna Dimsum Mentai - 300 pcs", price: 1800000 },
      { name: "Runna Dimsum Mentai - 500 pcs", price: 3000000 },
      { name: "Runna Dimsum Mentai - 900 pcs", price: 4950000 },
      { name: "Runna Dimsum Mentai - 1200 pcs", price: 6600000 },
      { name: "Runna Dimsum Mentai - 1400 pcs", price: 7700000 },
    ],
  },
  {
    category: "Runna Kitchen - Gyoza Mentai",
    items: [
      { name: "Runna Gyoza Mentai - 150 pcs", price: 1200000 },
      { name: "Runna Gyoza Mentai - 300 pcs", price: 2100000 },
      { name: "Runna Gyoza Mentai - 500 pcs", price: 3500000 },
      { name: "Runna Gyoza Mentai - 900 pcs", price: 6300000 },
      { name: "Runna Gyoza Mentai - 1200 pcs", price: 8400000 },
      { name: "Runna Gyoza Mentai - 1400 pcs", price: 9800000 },
    ],
  },
  {
    category: "Runna Kitchen - Mix (Dimsum & Gyoza)",
    items: [
      { name: "Runna Mix - 75+75 pcs", price: 1165000 },
      { name: "Runna Mix - 150+150 pcs", price: 1950000 },
      { name: "Runna Mix - 250+250 pcs", price: 3250000 },
      { name: "Runna Mix - 450+450 pcs", price: 5625000 },
      { name: "Runna Mix - 600+600 pcs", price: 7500000 },
      { name: "Runna Mix - 700+700 pcs", price: 8750000 },
    ],
  },
  {
    category: "Warmiepo",
    items: [
      { name: "Warmiepo Indomie (per pax)", price: 18000 },
      { name: "Warmiepo - Topping Sosis", price: 3000 },
      { name: "Warmiepo - Topping Nugget", price: 3000 },
      { name: "Warmiepo - Topping Bakso", price: 3000 },
      { name: "Warmiepo - Topping Telur", price: 6000 },
    ],
  },
];
