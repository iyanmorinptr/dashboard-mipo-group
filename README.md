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

## Login

Login memakai **Firebase Authentication** (email/password sungguhan, bukan
demo). Akun baru dibuat oleh Administrator lewat menu **Settings → Tambah
Staff** (langsung terdaftar di Firebase Authentication), atau lewat Firebase
Console (Authentication → Users → Add user) untuk akun pertama.

## Struktur

- `index.html` — halaman login ("WELCOME TO MIPO DASHBOARD")
- `dashboard.html` — shell dashboard dengan hamburger menu
- `js/firebase-init.js` — konfigurasi & inisialisasi Firebase (apiKey publik, aman untuk source control)
- `js/data.js` — lapisan data: Firestore (real-time, tersinkron di semua perangkat) + Firebase Authentication
- `js/app.js` — router antar menu, menunggu login & data siap sebelum menampilkan dashboard
- `js/modules/*.js` — modul Home, Schedule, Finance, Invoice, Inventory, Maintenance, Settings
- `css/style.css` — tema visual (hitam, krem, emas champagne) mengikuti identitas logo Mipo Group

## Arsitektur data (Firebase)

- **Firestore**: seluruh data (jadwal, keuangan, invoice, inventory,
  maintenance, info pembayaran, daftar staff) disimpan dalam satu dokumen
  (`mipo/app`) dan disinkronkan **real-time** ke semua perangkat yang sedang
  login — perubahan di HP langsung muncul di laptop dan sebaliknya, tanpa
  refresh.
- **Firebase Authentication**: menangani login (password tidak pernah
  disimpan di Firestore/source code). Peran (admin/staff) dan nama staff
  tetap disimpan di Firestore, dicocokkan berdasarkan email setelah login
  Firebase berhasil.
- **Firestore Rules**: hanya pengguna yang sudah login (`request.auth !=
  null`) yang bisa membaca/menulis data — lihat bagian Rules di Firebase
  Console project ini.
- **Keterbatasan yang perlu diketahui**: penyimpanan memakai satu dokumen
  Firestore yang ditulis ulang penuh setiap kali ada perubahan (bukan per
  field). Ini sederhana dan cukup untuk skala tim kecil, tapi jika dua orang
  menyimpan perubahan yang berbeda dalam waktu yang nyaris bersamaan,
  perubahan yang tersimpan lebih akhir bisa menimpa yang lain. Untuk tim
  besar dengan banyak input bersamaan, struktur data perlu dipecah per
  koleksi Firestore — beri tahu saya bila ingin ditingkatkan ke arah itu.
- Menghapus staff di menu Settings mencabut aksesnya ke dashboard, tapi
  **tidak** menghapus akun Firebase Authentication-nya (perlu dihapus
  manual lewat Firebase Console bila diperlukan).

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
