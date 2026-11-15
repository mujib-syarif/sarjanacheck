# sarjanacheck

## Tes

`npm test` (Node 22, tanpa dependensi): menguji Worker dengan `fetch` palsu (error upstream tidak bocor, jatah pagination per arah) dan memastikan berkas di `season.json` ada.

Secret/binding Worker: `CLASHKING_TOKEN` (opsional, mengaktifkan ClashKing v2) dan binding Rate Limiting `API_RATE_LIMITER` (opsional; tanpa itu hanya ada batas lokal per isolate).
