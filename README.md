# sarjanacheck

## Tes

`npm test` (Node 22, tanpa dependensi): menguji Worker dengan `fetch` palsu (error upstream tidak bocor, jatah pagination per arah) dan memastikan berkas di `season.json` ada.

Secret/binding Worker: `CLASHKING_TOKEN` (opsional, mengaktifkan ClashKing v2) dan binding Rate Limiting `API_RATE_LIMITER` (opsional; tanpa itu hanya ada batas lokal per isolate).

## App Android & Windows

Folder `app/` membungkus web ini jadi APK (Capacitor) dan installer Windows (Electron). Workflow `Build apps` jalan tiap push ke `main` yang menyentuh `index.html`, `assets/`, `season.json`, `clan-history.js` atau `app/`, lalu menerbitkan Release `app-v1.0.<run>` berisi APK + installer. Bisa juga dijalankan manual (Actions → Build apps → Run workflow). App membaca Release ini untuk fitur update.
