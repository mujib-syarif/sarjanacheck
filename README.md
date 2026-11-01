# Sarjana Checker

Asisten Clash of Clans: pengecek akun pemain, clan, War Log, Current War, dan CWL.

- **Frontend:** `index.html` (satu file, tanpa build), dihosting di GitHub Pages: <https://mujib-syarif.github.io/sarjanacheck/>
- **API:** Cloudflare Worker `sarjana-checker-api` (`worker.js`), yang meneruskan permintaan ke API Clash of Clans lewat proxy RoyaleAPI (`https://cocproxy.royaleapi.dev/v1`).

## Endpoint API

Semua endpoint memakai `GET` dan parameter `tag` (tag pemain atau clan, dengan atau tanpa `#`, mis. `%232J0P2GR08`). Respons berbentuk JSON `{ "ok": true, ... }` atau `{ "ok": false, "error": "..." }`.

| Endpoint | Fungsi |
| --- | --- |
| `/` | Info layanan dan versi |
| `/player?tag=` | Data pemain yang sudah dinormalisasi |
| `/clan?tag=` | Data clan dan anggota |
| `/cwl?tag=` | Clan War League clan |
| `/warlog?tag=` | Riwayat perang clan |
| `/currentwar?tag=` | Perang yang sedang berjalan |

Status error yang dipakai: `400` (parameter atau format tag salah), `404` (tag tidak ditemukan), `429` (terlalu banyak permintaan), `502` (API Clash of Clans bermasalah atau down), `500` (kesalahan tak terduga di Worker).

Worker hanya menjawab permintaan dari origin `https://mujib-syarif.github.io` (CORS). Ini membatasi browser, bukan klien seperti `curl`, jadi belum ada rate limit sungguhan.

## Konfigurasi

| Nama | Jenis | Fungsi |
| --- | --- | --- |
| `COC_API_TOKEN` | Worker secret | Token API Clash of Clans. Tidak pernah ada di frontend atau repository. |
| `CWL_ROSTER` | KV binding (`wrangler.jsonc`) | Penyimpanan roster CWL. |

Token dibuat di <https://developer.clashofclans.com> dan harus mengizinkan IP proxy yang dipakai.

## Menjalankan dan deploy

```bash
npm install -g wrangler
wrangler secret put COC_API_TOKEN   # sekali saja
wrangler dev                        # lokal
wrangler deploy                     # produksi
```

`season.json` berisi data musim untuk tampilan (hero dan latar), dan `sitemap.xml` serta `robots.txt` untuk SEO.

## Dokumen lain

- [`AUDIT.md`](AUDIT.md): audit awal (14 Okt 2026). Sebagian klaimnya sudah usang, misalnya konfigurasi deployment kini ada (`wrangler.jsonc`).
- [`ROADMAP.md`](ROADMAP.md): rencana fitur bertahap. Kotak centangnya belum diperbarui dan tertinggal dari kode.

## Batasan yang diketahui

- Belum ada test otomatis dan CI.
- Belum ada cache edge dan rate limit; setiap pencarian memanggil API sumber.
- `index.html` besar (sekitar 9.600 baris, JS inline) dan beberapa aset gambar berukuran besar.
