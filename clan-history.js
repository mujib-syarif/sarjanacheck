/* Separate clan archive tabs: Members / History / War History. */
(function () {
  'use strict';
  var originalRenderClan = window.renderClan;
  if (typeof originalRenderClan !== 'function') return;
  var active = 'members';
  var lastClanTag = ''; 
  var lastClan = null;
  var memberArchive = null;
  var warArchive = null;
  var loading = false;
  var failure = '';
  function esc(value) {
    var node = document.createElement('span');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
  }
  function arr(raw, keys) {
    if (Array.isArray(raw)) return raw;
    for (var i=0;i<keys.length;i++) if (raw && Array.isArray(raw[keys[i]])) return raw[keys[i]];
    if (raw && raw.archive) return arr(raw.archive, keys);
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
  }
  function val(obj, keys) {
    for (var i=0;i<keys.length;i++) if (obj && obj[keys[i]] != null && obj[keys[i]] !== '') return obj[keys[i]];
    return null;
  }
  function date(value) {
    if (!value) return '-';
    var d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
  }
  function section() { return document.querySelector('#clanContent .section'); }
  function draw() {
    var root = document.getElementById('clanContent');
    if (!root) return;
    var first = section();
    var nav = root.querySelector('.clan-history-tabs');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'clan-history-tabs';
      nav.setAttribute('aria-label','Clan sections');
      nav.innerHTML = '<button type="button" data-section="members">Members</button><button type="button" data-section="history">History</button><button type="button" data-section="warhistory">War History</button>';
      if (first) root.insertBefore(nav, first); else root.appendChild(nav);
      nav.addEventListener('click', function(e) {
        var button = e.target.closest('button[data-section]');
        if (!button) return;
        active = button.dataset.section;
        draw();
        if (active === 'history' && !memberArchive) load('memberhistory');
        if (active === 'warhistory' && !warArchive) load('warhistory');
      });
    }
    nav.querySelectorAll('button').forEach(function(b){b.classList.toggle('active',b.dataset.section===active);});
    if (first) first.style.display = active === 'members' ? '' : 'none';
    var panel = root.querySelector('.clan-history-panel');
    if (!panel) { panel = document.createElement('div'); panel.className='clan-history-panel'; nav.insertAdjacentElement('afterend',panel); }
    panel.style.display = active === 'members' ? 'none' : '';
    if (active === 'history') panel.innerHTML = renderMembers();
    else if (active === 'warhistory') panel.innerHTML = renderWars();
    else panel.innerHTML = '';
  }
  function renderMembers() {
    if (loading && !memberArchive) return '<section class="section"><div class="loading"><div class="spinner"></div><div class="loading-title">Memuat member history...</div></div></section>';
    if (failure && !memberArchive) return '<section class="section"><div class="error-box"><strong>Member history gagal dimuat</strong>'+esc(failure)+'<p><button class="retry-btn" data-retry="memberhistory">Coba lagi</button></p></div></section>';
    var items=arr(memberArchive,['items','members','history','results','joinLeave']);
    if (!memberArchive || !items.length) return '<section class="section"><div class="empty">Belum ada arsip member yang tersedia untuk klan ini.</div><div class="history-source-note">Sumber: ClashKing. Arsip bergantung pada periode pemantauan penyedia data.</div></section>';
    var rows=items.map(function(x){
      var joined=val(x,['joinDate','joinedAt','joinTime','joined','startTime','start_time']);
      var left=val(x,['leaveDate','leftAt','leaveTime','left','endTime','end_time']);
      var activeMember=!left || x.isInClan===true || x.current===true;
      return '<tr><td><b>'+esc(val(x,['name','playerName','player_name'])||'Unknown')+'</b><div class="history-tag">'+esc(val(x,['tag','playerTag','player_tag'])||'')+'</div></td><td>'+esc(val(x,['role','clanRole'])||'-')+'</td><td>'+esc(date(joined))+'</td><td>'+(activeMember?'<span class="history-current">Masih di klan</span>':esc(date(left)))+'</td></tr>';
    }).join('');
    return '<section class="section"><div class="section-head"><div class="section-title">Member History</div><div class="section-value">'+items.length+' catatan</div></div><div class="history-table-wrap"><table class="history-table"><thead><tr><th>Pemain</th><th>Jabatan</th><th>Tanggal masuk</th><th>Tanggal keluar</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="history-source-note">Sumber data: ClashKing.</div></section>';
  }
  function renderWars() {
    if (loading && !warArchive) return '<section class="section"><div class="loading"><div class="spinner"></div><div class="loading-title">Memuat war history...</div></div></section>';
    if (failure && !warArchive) return '<section class="section"><div class="error-box"><strong>War history gagal dimuat</strong>'+esc(failure)+'<p><button class="retry-btn" data-retry="warhistory">Coba lagi</button></p></div></section>';
    var items=arr(warArchive,['wars','items','history','results']);
    if (!warArchive || !items.length) return '<section class="section"><div class="empty">Belum ada arsip war yang tersedia untuk klan ini.</div><div class="history-source-note">Sumber: ClashKing. Tidak semua perang lama pasti tersedia.</div></section>';
    var rows=items.map(function(w){var c=w.clan||{},o=w.opponent||{};return '<tr><td>'+esc(date(val(w,['endTime','end_time','date','time','startTime'])))+'</td><td><b>'+esc(o.name||w.opponentName||'Unknown')+'</b><div class="history-tag">'+esc(o.tag||'')+'</div></td><td>'+esc(val(w,['result','outcome','state'])||'-')+'</td><td>'+esc(val(c,['stars'])==null?'-':val(c,['stars']))+' ★</td><td>'+esc(val(c,['destructionPercentage'])==null?'-':val(c,['destructionPercentage'])+'%')+'</td><td>'+esc(val(w,['teamSize','team_size','size'])||'-')+'</td></tr>';}).join('');
    return '<section class="section"><div class="section-head"><div class="section-title">War History</div><div class="section-value">'+items.length+' perang</div></div><div class="history-table-wrap"><table class="history-table"><thead><tr><th>Tanggal</th><th>Lawan</th><th>Hasil</th><th>Bintang</th><th>Destruction</th><th>Peserta</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="history-source-note">Sumber data: ClashKing.</div></section>';
  }
  async function load(kind) {
    var clan=lastClan;
    if (!clan || !clan.tag || typeof window.api!=='function' || loading) return;
    loading=true; failure=''; draw();
    try { var data=await window.api(kind,clan.tag); if(kind==='memberhistory') memberArchive=data; else warArchive=data; }
    catch(e){failure=e&&e.message?e.message:'Gagal mengambil arsip.';}
    finally {loading=false;draw();}
  }
  document.addEventListener('click',function(e){var b=e.target.closest('[data-retry]');if(b)load(b.dataset.retry);});
  window.renderClan=function(clan){
    var tag = clan && clan.tag ? String(clan.tag) : '';
    if (tag !== lastClanTag) { lastClanTag = tag; lastClan = clan; active = 'members'; memberArchive = null; warArchive = null; failure = ''; }
    else lastClan = clan;
    originalRenderClan(clan);
    draw();
  };
  var style=document.createElement('style');
  style.textContent='.clan-history-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:0 0 12px}.clan-history-tab,.clan-history-tabs button{min-height:40px;padding:8px 7px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font-size:12px;font-weight:800}.clan-history-tabs button.active{border-color:var(--accent);background:var(--accent);color:#fff}.history-table-wrap{overflow-x:auto}.history-table{width:100%;border-collapse:collapse;font-size:12px}.history-table th,.history-table td{padding:10px 9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;white-space:nowrap}.history-table th{color:var(--muted);font-size:10px}.history-tag{color:var(--muted);font-size:10px}.history-current{color:var(--green);font-weight:800}.history-source-note{color:var(--muted);font-size:11px;margin-top:10px;line-height:1.5}@media(max-width:420px){.clan-history-tabs button{font-size:10px}}';
  document.head.appendChild(style);
})();