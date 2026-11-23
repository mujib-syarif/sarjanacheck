/* Update checker untuk app Android (Capacitor) & Windows (Electron).
   Disuntik ke index.html hanya saat build app (lihat .github/workflows/build-apps.yml);
   versi web biasa tidak berubah. */
(function () {
  'use strict';
  var REPO = 'mujib-syarif/sarjanacheck';
  var TAG_PREFIX = 'app-v';
  var desktop = window.sarjanaDesktop || null;
  var cap = window.Capacitor;
  var isAndroid = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  if (!desktop && !isAndroid) return;

  var current = String((desktop && desktop.version) || window.__APP_VERSION__ || '0.0.0');

  function parse(v) {
    return String(v).replace(/^[^0-9]*/, '').split('.').map(function (n) { return parseInt(n, 10) || 0; });
  }
  function newer(a, b) {
    var x = parse(a), y = parse(b);
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0;
    }
    return false;
  }

  /* ---------- UI ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#appUpd{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:99999;' +
    'max-width:420px;margin:0 auto;background:#10131a;color:#fff;border-radius:16px;padding:14px 16px;' +
    'box-shadow:0 10px 40px rgba(0,0,0,.45);font:600 14px/1.4 system-ui,sans-serif;display:none}' +
    '#appUpd small{display:block;font-weight:500;opacity:.75;margin-top:2px}' +
    '#appUpd .r{display:flex;gap:8px;margin-top:10px}' +
    '#appUpd button{flex:1;border:0;border-radius:10px;padding:10px;font:700 14px system-ui;cursor:pointer}' +
    '#appUpd .go{background:#fff;color:#10131a}#appUpd .no{background:#2a2f3a;color:#fff}' +
    '#appVer{position:fixed;left:8px;bottom:calc(6px + env(safe-area-inset-bottom,0px));z-index:9999;' +
    'font:600 10px system-ui;color:#8a93a5;background:rgba(16,19,26,.55);border:0;border-radius:999px;padding:3px 8px}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'appUpd';
  document.body.appendChild(box);

  var chip = document.createElement('button');
  chip.id = 'appVer';
  chip.textContent = 'v' + current + ' · cek update';
  document.body.appendChild(chip);

  function show(title, sub, buttons) {
    box.innerHTML = '';
    var t = document.createElement('div');
    t.textContent = title;
    if (sub) { var s = document.createElement('small'); s.textContent = sub; t.appendChild(s); }
    box.appendChild(t);
    var row = document.createElement('div');
    row.className = 'r';
    (buttons || []).forEach(function (b) {
      var el = document.createElement('button');
      el.className = b.cls || 'no';
      el.textContent = b.label;
      el.onclick = b.fn;
      row.appendChild(el);
    });
    if (buttons && buttons.length) box.appendChild(row);
    box.style.display = 'block';
  }
  function hide() { box.style.display = 'none'; }
  var close = { label: 'Nanti', cls: 'no', fn: hide };

  /* ---------- Windows: electron-updater yang kerja, UI cuma nampilin status ---------- */
  if (desktop) {
    var pending = false;
    desktop.onUpdate(function (e) {
      if (e.type === 'available') { pending = true; show('Update v' + e.version + ' ditemukan', 'Mengunduh…', []); }
      else if (e.type === 'progress') show('Mengunduh update… ' + Math.round(e.percent) + '%', '', []);
      else if (e.type === 'downloaded') show('Update v' + e.version + ' siap', 'Restart app untuk memasang.',
        [{ label: 'Restart & update', cls: 'go', fn: function () { desktop.install(); } }, close]);
      else if (e.type === 'none') { if (pending || manual) show('Sudah versi terbaru', 'v' + current, [close]); pending = false; manual = false; }
      else if (e.type === 'error') { if (manual) show('Gagal cek update', e.message || '', [close]); manual = false; }
    });
    var manual = false;
    chip.onclick = function () { manual = true; show('Mengecek update…', '', []); desktop.check(); };
    return;
  }

  /* ---------- Android: cek GitHub Releases, buka APK di browser untuk dipasang ---------- */
  function openUrl(u) {
    var B = cap.Plugins && cap.Plugins.Browser;
    if (B && B.open) B.open({ url: u }); else window.open(u, '_system');
  }

  function check(manual) {
    if (manual) show('Mengecek update…', '', []);
    return fetch('https://api.github.com/repos/' + REPO + '/releases?per_page=20', {
      headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (list) {
      var rel = (list || []).filter(function (x) {
        return !x.draft && !x.prerelease && String(x.tag_name).indexOf(TAG_PREFIX) === 0;
      })[0];
      if (!rel) { if (manual) show('Belum ada rilis', '', [close]); return; }
      var ver = rel.tag_name.slice(TAG_PREFIX.length);
      if (!newer(ver, current)) { if (manual) show('Sudah versi terbaru', 'v' + current, [close]); return; }
      var apk = (rel.assets || []).filter(function (a) { return /\.apk$/i.test(a.name); })[0];
      var url = apk ? apk.browser_download_url : rel.html_url;
      show('Update v' + ver + ' tersedia', 'Kamu pakai v' + current + '. Unduh lalu buka file APK-nya untuk memasang.',
        [{ label: 'Unduh', cls: 'go', fn: function () { openUrl(url); hide(); } }, close]);
    }).catch(function (err) {
      if (manual) show('Gagal cek update', String(err && err.message || err), [close]);
    });
  }

  chip.onclick = function () { check(true); };
  setTimeout(function () { check(false); }, 2500);
})();
