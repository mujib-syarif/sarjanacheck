# Sarjana Checker — All-in-one CoC Assistant Roadmap

**Status:** Roadmap awal; implementasi dilakukan bertahap setelah audit kondisi kode aktual.  
**Frontend:** GitHub Pages  
**Backend/proxy API:** Cloudflare Worker  
**Prinsip:** pertahankan fitur yang sudah ada, hindari rewrite total, dan jangan mengarang data yang tidak disediakan API.

## Visi Produk

Sarjana Checker berkembang menjadi satu asisten Clash of Clans untuk analisis akun, rekomendasi upgrade, analisis war, pengelolaan clan, dan CWL.

## Tahap 0 — Stabilisasi dan Audit

**Prioritas: wajib sebelum fitur baru.**

- [ ] Catat kondisi repo dan commit terakhir sebagai baseline.
- [ ] Inventarisasi fitur yang berjalan, bug yang diketahui, dan fitur yang belum selesai.
- [ ] Audit `index.html`, `worker.js` (atau nama Worker aktual), endpoint, serta konfigurasi deployment.
- [ ] Pastikan token API hanya tersimpan sebagai secret di Cloudflare Worker, tidak di frontend atau repository.
- [ ] Uji alur pencarian pemain, clan, Current War, War Log, dan CWL.
- [ ] Bedakan error UI, Worker, proxy, dan API sumber.
- [ ] Siapkan langkah rollback untuk setiap perubahan.

**Kriteria selesai:** baseline dan daftar masalah diketahui; fitur lama tidak sengaja dihapus.

## Tahap 1 — Account Analyzer

- [ ] Ringkasan akun: Town Hall, level, hero, equipment, dan progres yang didukung data.
- [ ] Tampilkan batas level sesuai Town Hall hanya berdasarkan data yang dapat diverifikasi.
- [ ] Indikator progres per kategori, dengan status data yang belum tersedia.
- [ ] Deteksi maksimal untuk TH berdasarkan batas yang benar dan lengkap.
- [ ] Layout ringkas dan responsif untuk HP.

**Kriteria selesai:** hasil perhitungan konsisten dengan aturan level yang terverifikasi dan tidak menganggap data kosong sebagai progres nol tanpa penjelasan.

## Tahap 2 — Smart Upgrade Advisor

- [ ] Mulai dengan aturan lokal yang transparan; AI API berbayar bukan dependensi wajib.
- [ ] Prioritaskan upgrade berdasarkan TH, level saat ini, dan aturan yang tervalidasi.
- [ ] Jelaskan alasan setiap rekomendasi.
- [ ] Bedakan rekomendasi pasti, perkiraan, dan data yang belum tersedia.

**Kriteria selesai:** setiap rekomendasi dapat dijelaskan dan diuji dengan contoh akun.

## Tahap 3 — War Intelligence

- [ ] Ringkasan hasil war dan tren menang/kalah dari riwayat yang tersedia.
- [ ] Ringkasan serangan clan dan lawan bila API menyediakan datanya.
- [ ] Statistik peserta hanya untuk konteks yang benar-benar tersedia.
- [ ] Insight evaluasi war yang tidak mengklaim data yang tidak ada.

**Batasan:** jangan menjanjikan riwayat serangan individu untuk war yang sudah selesai jika endpoint sumber tidak menyediakannya.

## Tahap 4 — Clan & CWL Assistant

- [ ] Filter dan ranking anggota berdasarkan metrik yang tersedia.
- [ ] Ringkasan roster, TH, role, dan kesiapan anggota bila datanya mendukung.
- [ ] Ringkasan hasil ronde CWL dan statistik clan.
- [ ] Perbandingan anggota dengan label metrik yang jelas.

**Kriteria selesai:** angka dapat ditelusuri ke sumber data dan tidak menyamakan data yang hilang dengan nol.

## Tahap 5 — Dashboard Terpadu

- [ ] Satukan navigasi Account, Upgrade, War, Clan, dan CWL.
- [ ] Sediakan pencarian pemain/clan yang konsisten.
- [ ] Tambahkan riwayat pencarian lokal hanya jika bermanfaat dan jelas bagi pengguna.
- [ ] Seragamkan loading, error, empty state, dan partial-data state.
- [ ] Pertahankan identitas Sarjana Checker dan optimalkan pengalaman mobile.

**Kriteria selesai:** modul dapat digunakan melalui alur navigasi yang konsisten tanpa merusak fitur lama.

## Prinsip Teknis dan Keamanan

1. Kerjakan satu perubahan kecil per commit.
2. Ambil versi terbaru sebelum mengubah file; jangan menimpa perubahan terbaru.
3. Jangan melakukan rewrite besar hanya demi merapikan kode.
4. Simpan token dan rahasia hanya di konfigurasi secret backend.
5. Validasi input dan tangani timeout, rate limit, respons gagal, serta data parsial.
6. Jangan menambahkan layanan berbayar sebagai syarat fitur inti.
7. Tes fitur lama dan baru, terutama tampilan mobile, sebelum deploy.
8. Periksa konfigurasi deployment sebelum mengubah Worker atau GitHub Pages.
9. Catat file yang diubah, alasan, pengujian, dan risiko pada setiap perubahan.
10. Jika perubahan menyebabkan regresi, rollback perubahan terakhir terlebih dahulu.

## Alur Kerja Setiap Tahap

1. Audit kode dan data yang benar-benar tersedia.
2. Buat rencana perubahan file dan kriteria penerimaan.
3. Implementasikan satu fitur dalam perubahan terisolasi.
4. Jalankan pemeriksaan statis dan tes yang tersedia.
5. Uji regresi fitur lama.
6. Commit dengan pesan yang menjelaskan perubahan.
7. Verifikasi hasil deployment secara terpisah.

## Prioritas Saat Ini

**Jangan langsung membangun semua tahap.** Mulai dari Tahap 0: audit repo dan verifikasi jalur API. Setelah baseline jelas, lanjut ke Tahap 1 — Account Analyzer.
