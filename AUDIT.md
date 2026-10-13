# Audit Repo — Sarjana Checker

**Tanggal audit:** 14 Oktober 2026  
**Branch:** `main`  
**Cakupan:** inspeksi kode `index.html` dan `worker.js` pada repo; bukan pengujian runtime penuh.

## Ringkasan

Repo sudah memiliki fondasi Account Analyzer, sehingga tahap berikutnya bukan membangun halaman akun dari nol. Frontend menormalisasi respons pemain, menghitung progres hero/equipment, dan menampilkan kartu hero; Worker menormalisasi data API dan menyediakan endpoint untuk data game.

## Temuan yang terlihat dari kode

### Frontend — `index.html`

- Fungsi `loadPlayer(tag)` memanggil endpoint pemain, lalu meneruskan respons ke `normalizePlayer(raw)` dan `renderPlayer(...)`.
- `renderPlayer(player)` sudah memisahkan hero Home Village dan Builder Base serta membuat kartu hero.
- Kartu hero menampilkan level, batas maksimum, progress bar, dan label MAX bila batas maksimum diketahui.
- Fungsi `heroMaxFor(hero, player)` mengutamakan batas dari API, lalu fallback ke tabel `HOME_HERO_MAX` atau `BUILDER_HERO_MAX`.
- Fungsi `equipmentMaxFor(item, player, isEpic)` menangani batas level equipment.
- UI telah memiliki komponen untuk data hero/equipment dan status data kosong.

### Backend — `worker.js`

- Worker mengambil data pemain melalui endpoint upstream `/players/{tag}` dan menjalankan `normalizePlayer(player)`.
- Normalisasi mencakup level Town Hall, XP, trophy, statistik, hero, dan hero equipment.
- Jalur Worker yang terlihat mencakup endpoint untuk player, clan, war log, dan current war.
- Worker menangani respons gagal upstream, retry untuk status tertentu, timeout, dan pesan error.
- CORS dikonfigurasi untuk origin GitHub Pages yang digunakan aplikasi.

## Hal yang belum terverifikasi

- Pengujian runtime langsung di browser dan pengujian setiap endpoint terhadap akun nyata belum dilakukan dalam audit ini.
- Ketepatan seluruh tabel maksimum hero/equipment untuk setiap Town Hall perlu dibandingkan dengan sumber data terkini.
- Status secret Cloudflare tidak dapat diverifikasi hanya dari kode repo; pastikan token tersimpan sebagai Worker secret dan tidak berada di frontend.
- Konfigurasi deployment Worker tidak ditemukan pada path `wrangler.toml`; konfigurasi bisa dikelola lewat dashboard atau file lain.
- Keberhasilan deployment GitHub Pages/Cloudflare tidak disimpulkan hanya dari keberadaan kode.

## Risiko dan rekomendasi

1. **Risiko data progres salah:** jika batas maksimum fallback tidak mutakhir atau data API kosong, label MAX dan persentase bisa menyesatkan. Validasi tabel dan bedakan batas yang tidak diketahui dari nilai nol.
2. **Risiko regresi:** `index.html` cukup besar dan memuat banyak fitur dalam satu file. Ubah bagian kecil dan hindari rewrite total.
3. **Risiko API:** jangan mengasumsikan semua data serangan, CWL, atau war historis tersedia. UI harus menjelaskan data yang tidak disediakan.
4. **Keamanan:** jangan memindahkan token ke frontend atau memasukkannya ke commit.
5. **Deployment:** pisahkan commit perubahan kode dari perubahan konfigurasi deployment bila memungkinkan.

## Rencana implementasi berikutnya — Account Analyzer

### Langkah 1: verifikasi aturan data
- Inventarisasi tabel batas hero dan equipment.
- Bandingkan nilai yang ada dengan sumber terkini yang dapat diverifikasi.
- Buat daftar nilai yang perlu diperbaiki sebelum mengubah perhitungan.

### Langkah 2: ringkasan akun
- Tambahkan ringkasan progres yang menggunakan data yang sudah dinormalisasi.
- Tampilkan jumlah item maksimal dan belum maksimal hanya ketika batas maksimumnya diketahui.
- Tampilkan indikator “data belum tersedia” bila perhitungan tidak dapat dilakukan.

### Langkah 3: rekomendasi upgrade
- Mulai dengan aturan transparan, tanpa AI API berbayar.
- Tampilkan alasan setiap rekomendasi.
- Jangan menyebut rekomendasi sebagai prioritas pasti jika informasi biaya, durasi, atau konteks akun tidak tersedia.

### Langkah 4: pengujian regresi
- Uji pencarian player dan clan.
- Uji hero/equipment dengan data lengkap dan data parsial.
- Uji TH berbeda dan Builder Base.
- Uji Current War, War Log, CWL, loading, error, dan tampilan mobile.
- Deploy hanya setelah pemeriksaan tersebut.

## Kesimpulan

Fondasi Account Analyzer sebagian sudah ada. Pekerjaan paling aman selanjutnya adalah **memvalidasi aturan batas level dan kondisi data parsial terlebih dahulu**, kemudian menambah ringkasan progres. Audit ini belum menyatakan bahwa seluruh fitur telah lulus pengujian runtime.
