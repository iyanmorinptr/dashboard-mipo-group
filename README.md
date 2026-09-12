# Dashboard Mipo Group

Dashboard internal untuk operasional Mipo Group — jadwal client, keuangan,
invoice, inventory, dan maintenance aset.

## Menjalankan secara lokal

Ini adalah aplikasi statis (HTML/CSS/JS), tidak perlu build tool. Buka
`index.html` langsung di browser, atau jalankan server statis sederhana:

```
npx serve .
```

Lalu akses `http://localhost:3000`.

## Login demo

- Administrator (akses penuh): `admin@mipogroup.com` / `admin123`
- Staff (lihat saja): `staff@mipogroup.com` / `staff123`

Akun staff bisa ditambah/diubah lewat menu **Settings** oleh Administrator.

## Struktur

- `index.html` — halaman login ("WELCOME TO MIPO DASHBOARD")
- `dashboard.html` — shell dashboard dengan hamburger menu
- `js/data.js` — data seed & helper localStorage (ganti dengan API/database saat backend siap)
- `js/app.js` — router antar menu
- `js/modules/*.js` — modul Schedule, Finance, Invoice, Inventory, Maintenance, Settings
- `css/style.css` — tema visual (hitam, krem, emas champagne) mengikuti identitas logo Mipo Group

## Catatan penting

Versi ini menyimpan data di `localStorage` browser (belum ada backend/database
terpusat), sehingga data hanya tersimpan per perangkat/browser dan tidak
otomatis tersinkron antar staff. Ini cocok untuk demo/prototipe; untuk
penggunaan produksi dengan banyak staff yang perlu melihat data yang sama
secara real-time, perlu ditambahkan backend (API + database) — beri tahu
saya jika ingin dilanjutkan ke tahap ini.

## Modul

1. **Schedule** (halaman utama) — jadwal client: menu yang keluar, nama
   client, jam keberangkatan, jam standby di lokasi, staff in charge.
   Input & edit hanya untuk akun Administrator.
2. **Finance** — kas perusahaan, pemasukan, pengeluaran, omset, profit.
3. **Invoice** — pembuatan invoice & rekapan; saat invoice ditandai lunas,
   otomatis tercatat sebagai pemasukan di Finance (dengan referensi nomor
   invoice, nama client, dan nama transaksi). Setiap invoice bisa dilihat
   sebagai kartu bergaya cetak (desain Mipo Group) dan diunduh/dibagikan
   sebagai gambar PNG langsung ke WhatsApp lewat tombol "Bagikan ke
   WhatsApp" (memakai Web Share API bila didukung perangkat/browser;
   kalau tidak, gambar diunduh lalu dibagikan manual).
4. **Inventory** — peralatan & perlengkapan milik perusahaan.
5. **Maintenance** — jadwal perawatan peralatan/perlengkapan & pembayaran
   pajak aset.
6. **Settings** — profil akun, info pembayaran (rekening bank yang tampil
   di invoice — diisi sendiri lewat menu ini, tidak ditulis di source
   code), & manajemen akun staff (khusus Administrator).
