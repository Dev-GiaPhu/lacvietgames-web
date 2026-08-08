(() => {
  if (!document.body?.classList.contains("admin-page")) return;

  const API=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const KEY="lacvietgamesStoreSession";
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const fmt=n=>Number(n||0).toLocaleString("vi-VN");
  const when=v=>v?new Date(v).toLocaleString("vi-VN"):"—";
  let users=[],incidents=[],bans=[],timer=null;

  function read(){for(const s of[sessionStorage,localStorage]){try{const r=s.getItem(KEY);if(r)return JSON.parse(r)}catch{}}return null}
  async function req(path,opt={}){
    const s=read();if(!s?.token)throw new Error("Bạn chưa đăng nhập Admin.");
    const r=await fetch(`${API}${path}`,{method:opt.method||"GET",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.token}`},body:opt.body?JSON.stringify(opt.body):undefined});
    const p=await r.json().catch(()=>null);if(!r.ok||p?.success===false){const e=new Error(p?.message||"Không thể xử lý yêu cầu.");e.code=p?.code;e.status=r.status;throw e}return p;
  }
  function status(message="",error=false){const e=document.getElementById("securityStatus");if(!e)return;e.textContent=message;e.classList.toggle("error",error)}
  function injectStyle(){if(document.getElementById("lvgSecurityStyle"))return;const s=document.createElement("style");s.id="lvgSecurityStyle";s.textContent=`
    .security-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:18px}.security-stat{background:#101620;border:1px solid #263047;border-radius:16px;padding:16px}.security-stat small{color:#8492ab}.security-stat strong{display:block;font-size:25px;margin-top:7px}.security-danger{color:#ff8b9c}.security-warn{color:#ffc36a}.security-ok{color:#83e6ae}.security-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(330px,.8fr);gap:16px}.security-card{background:#0e1521;border:1px solid #263047;border-radius:17px;padding:16px}.security-card h3{margin:0 0 12px}.security-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.security-tools select,.security-tools input,.security-form select,.security-form input,.security-form textarea{background:#0b111c;border:1px solid #303d57;color:#e8edf7;border-radius:10px;padding:10px;font:inherit;box-sizing:border-box}.security-form{display:grid;gap:10px}.security-form label{display:grid;gap:6px;color:#cdd6e7;font-size:13px}.security-form textarea{min-height:90px;resize:vertical}.security-duration{display:grid;grid-template-columns:1fr 1fr;gap:8px}.security-incident{padding:14px;border:1px solid #263047;border-radius:14px;margin-bottom:10px;background:#0b121d}.security-incident-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.security-incident h4{margin:0 0 6px}.security-meta{color:#8592aa;font-size:12px;line-height:1.6}.security-detail{color:#c6cede;font-size:13px;line-height:1.55;margin:10px 0}.security-actions{display:flex;gap:7px;flex-wrap:wrap}.security-chip{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid #35425c}.security-chip.Critical{color:#ff8b9c;border-color:#773342;background:#2c1119}.security-chip.High{color:#ffb06f;border-color:#73462b;background:#291a10}.security-chip.Medium{color:#ffe07a;border-color:#665526;background:#25210f}.security-chip.Low{color:#91bfff}.security-ban{padding:12px;border-bottom:1px solid #202a3a}.security-ban:last-child{border-bottom:0}.security-ban b{display:block}.security-empty{padding:18px;text-align:center;color:#7d8aa1}.security-note{font-size:12px;color:#8492ab;line-height:1.6}.security-status{min-height:22px;margin:8px 0;color:#83e6ae}.security-status.error{color:#ff9ba8}@media(max-width:1100px){.security-grid{grid-template-columns:repeat(2,1fr)}.security-layout{grid-template-columns:1fr}}@media(max-width:650px){.security-grid{grid-template-columns:1fr}.security-duration{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}

  function buildUi(){
    injectStyle();
    const nav=document.querySelector(".admin-nav"),content=document.querySelector(".admin-content");if(!nav||!content||document.getElementById("securityNav"))return;
    const button=document.createElement("button");button.id="securityNav";button.type="button";button.innerHTML='<span>Bảo mật & Ban</span><span id="securityNavCount" class="nav-count">0</span>';
    const usersButton=nav.querySelector('[data-admin-section="users"]');usersButton?.insertAdjacentElement("afterend",button)||nav.appendChild(button);
    const panel=document.createElement("section");panel.id="securityPanel";panel.className="admin-section";panel.hidden=true;panel.innerHTML=`
      <div class="admin-section-head"><div><h2>Security Center</h2><p>Reward anti-abuse, cảnh báo hành vi bất thường và quản lý ban tài khoản.</p></div><button id="securityRefresh" class="admin-secondary" type="button">Làm mới</button></div>
      <div id="securityStatus" class="security-status"></div>
      <div class="security-grid">
        <article class="security-stat"><small>Cảnh báo đang mở</small><strong id="secOpen">—</strong></article>
        <article class="security-stat"><small>Critical</small><strong id="secCritical" class="security-danger">—</strong></article>
        <article class="security-stat"><small>High</small><strong id="secHigh" class="security-warn">—</strong></article>
        <article class="security-stat"><small>Incident 24 giờ</small><strong id="sec24h">—</strong></article>
        <article class="security-stat"><small>Đang bị ban</small><strong id="secBans">—</strong></article>
      </div>
      <div class="security-layout">
        <article class="security-card"><h3>Cảnh báo anti-cheat / anti-abuse</h3><div class="security-tools"><select id="incidentStatus"><option value="Open">Open</option><option value="Reviewed">Reviewed</option><option value="Resolved">Resolved</option><option value="FalsePositive">False Positive</option><option value="">Tất cả</option></select><select id="incidentSeverity"><option value="">Mọi mức</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><button id="loadIncidents" class="admin-secondary" type="button">Lọc</button></div><div id="incidentList"></div></article>
        <div style="display:grid;gap:16px;align-content:start">
          <article class="security-card"><h3>Ban người dùng</h3><form id="banForm" class="security-form"><label>Tài khoản<select id="banAccount" required><option value="">Đang tải...</option></select></label><label>Loại ban<select id="banType"><option value="Temporary">Ban có thời hạn</option><option value="Permanent">Ban vĩnh viễn</option></select></label><div id="banDurationWrap" class="security-duration"><label>Thời lượng<input id="banDuration" type="number" min="1" max="365" value="24" required></label><label>Đơn vị<select id="banUnit"><option value="60">Giờ</option><option value="1440">Ngày</option><option value="1">Phút</option></select></label></div><label>Lý do<textarea id="banReason" maxlength="1000" required placeholder="Ghi rõ bằng chứng/lý do để lưu audit..."></textarea></label><p class="security-note">Ban sẽ thu hồi phiên đăng nhập hiện tại, đóng play session đang chạy và chặn API bằng server. Không thể ban tài khoản Admin tại đây.</p><button class="admin-danger-btn" type="submit">Ban tài khoản</button></form></article>
          <article class="security-card"><h3>Ban đang hoạt động</h3><div id="banList"></div></article>
        </div>
      </div>`;
    content.appendChild(panel);

    button.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();openSecurity()},{capture:true});
    document.addEventListener("click",e=>{const other=e.target.closest?.("[data-admin-section]");if(other){panel.hidden=true;button.classList.remove("active");stopTimer()}},true);
    document.getElementById("securityRefresh").addEventListener("click",loadAll);
    document.getElementById("loadIncidents").addEventListener("click",loadIncidents);
    document.getElementById("banType").addEventListener("change",()=>{document.getElementById("banDurationWrap").hidden=document.getElementById("banType").value==="Permanent"});
    document.getElementById("banForm").addEventListener("submit",submitBan);
    panel.addEventListener("click",handlePanelClick);
    if(location.hash==="#security")setTimeout(()=>{if(!document.getElementById("adminShell")?.hidden)openSecurity()},500);
    refreshBadge();
  }

  function openSecurity(){
    document.querySelectorAll("[data-section-panel]").forEach(p=>p.hidden=true);document.querySelectorAll(".admin-nav button").forEach(b=>b.classList.remove("active"));
    document.getElementById("securityPanel").hidden=false;document.getElementById("securityNav").classList.add("active");const title=document.getElementById("adminPageTitle");if(title)title.textContent="Bảo mật & Ban";
    history.replaceState(null,"",`${location.pathname}${location.search}#security`);loadAll();startTimer();
  }
  function startTimer(){stopTimer();timer=setInterval(()=>{if(!document.getElementById("securityPanel")?.hidden){loadOverview();loadIncidents()}},30000)}function stopTimer(){if(timer)clearInterval(timer);timer=null}

  async function refreshBadge(){try{const r=await req("/api/store/admin/security/overview"),d=r.data||{};const n=Number(d.criticalIncidents||0)+Number(d.highIncidents||0);const e=document.getElementById("securityNavCount");if(e)e.textContent=fmt(n)}catch{} }
  async function loadOverview(){try{const r=await req("/api/store/admin/security/overview"),d=r.data||{};document.getElementById("secOpen").textContent=fmt(d.openIncidents);document.getElementById("secCritical").textContent=fmt(d.criticalIncidents);document.getElementById("secHigh").textContent=fmt(d.highIncidents);document.getElementById("sec24h").textContent=fmt(d.incidents24h);document.getElementById("secBans").textContent=fmt(d.activeBans);document.getElementById("securityNavCount").textContent=fmt(Number(d.criticalIncidents||0)+Number(d.highIncidents||0))}catch(e){status(e.message,true)}}
  async function loadUsers(){try{const r=await req("/api/store/admin/users");users=(r.data||[]).filter(u=>String(u.role).toLowerCase()!=="admin");const sel=document.getElementById("banAccount");const current=sel.value;sel.innerHTML='<option value="">Chọn tài khoản...</option>'+users.map(u=>`<option value="${u.id}">#${u.id} · ${esc(u.name)} · ${esc(u.email)} · ${fmt(u.coinBalance)} LC</option>`).join("");if(users.some(u=>String(u.id)===current))sel.value=current}catch(e){status(e.message,true)}}
  async function loadIncidents(){try{const st=document.getElementById("incidentStatus").value,sev=document.getElementById("incidentSeverity").value;const r=await req(`/api/store/admin/security/incidents?status=${encodeURIComponent(st)}&severity=${encodeURIComponent(sev)}&limit=250`);incidents=r.data||[];renderIncidents()}catch(e){status(e.message,true)}}
  function renderIncidents(){const el=document.getElementById("incidentList");el.innerHTML=incidents.map(i=>`<div class="security-incident"><div class="security-incident-top"><div><h4>${esc(i.title)}</h4><div class="security-meta">#${i.id} · ${esc(i.accountName||"Unknown")} ${i.email?`· ${esc(i.email)}`:""} ${i.gameName?`· ${esc(i.gameName)}`:""}<br>${esc(i.category)} · Risk ${fmt(i.riskScore)}/100 · ${fmt(i.occurrenceCount)} lần · ${when(i.lastSeenAt)}</div></div><span class="security-chip ${esc(i.severity)}">${esc(i.severity)}</span></div><div class="security-detail">${esc(i.detail)}</div>${i.eventKey?`<div class="security-meta">Event: <code>${esc(i.eventKey)}</code>${i.playSessionId?` · Session: ${esc(i.playSessionId)}`:""}</div>`:""}<div class="security-actions"><button class="admin-secondary" data-sec-review="${i.id}" data-sec-status="Reviewed">Reviewed</button><button class="admin-primary" data-sec-review="${i.id}" data-sec-status="Resolved">Resolved</button><button class="admin-ghost" data-sec-review="${i.id}" data-sec-status="FalsePositive">False Positive</button>${i.accountId?`<button class="admin-danger-btn" data-sec-ban-user="${i.accountId}">Ban user</button>`:""}</div></div>`).join("")||'<div class="security-empty">Không có cảnh báo phù hợp bộ lọc.</div>'}
  async function loadBans(){try{const r=await req("/api/store/admin/security/bans?activeOnly=true");bans=r.data||[];renderBans()}catch(e){status(e.message,true)}}
  function renderBans(){const el=document.getElementById("banList");el.innerHTML=bans.map(b=>`<div class="security-ban"><b>${esc(b.accountName)} · ${esc(b.email)}</b><div class="security-meta">${esc(b.banType)} · từ ${when(b.startsAt)}${b.endsAt?` đến ${when(b.endsAt)}`:" · vĩnh viễn"}</div><div class="security-detail">${esc(b.reason)}</div><button class="admin-secondary" data-sec-lift="${b.id}">Gỡ ban</button></div>`).join("")||'<div class="security-empty">Không có tài khoản đang bị ban.</div>'}
  async function loadAll(){status("Đang tải dữ liệu bảo mật...");await Promise.all([loadOverview(),loadUsers(),loadIncidents(),loadBans()]);status("Security Center đã đồng bộ với server.")}

  async function submitBan(e){e.preventDefault();const accountId=Number(document.getElementById("banAccount").value),banType=document.getElementById("banType").value,reason=document.getElementById("banReason").value.trim();if(!accountId||reason.length<5)return status("Chọn tài khoản và nhập lý do ban rõ ràng.",true);let durationMinutes=null;if(banType==="Temporary"){const amount=Number(document.getElementById("banDuration").value),unit=Number(document.getElementById("banUnit").value);if(!Number.isFinite(amount)||amount<=0)return status("Thời lượng ban không hợp lệ.",true);durationMinutes=Math.round(amount*unit)}const u=users.find(x=>Number(x.id)===accountId);if(!confirm(`Ban ${u?.email||`#${accountId}`} ${banType==="Permanent"?"VĨNH VIỄN":`trong ${durationMinutes} phút`}?\n\nLý do: ${reason}`))return;try{const r=await req("/api/store/admin/security/bans",{method:"POST",body:{accountId,banType,durationMinutes,reason}});status(r.message);document.getElementById("banReason").value="";await Promise.all([loadBans(),loadOverview(),loadUsers()])}catch(x){status(x.message,true)}}
  async function handlePanelClick(e){const review=e.target.closest("[data-sec-review]");if(review){const id=Number(review.dataset.secReview),st=review.dataset.secStatus;const note=prompt(`Ghi chú ${st}:`,"")??"";try{await req(`/api/store/admin/security/incidents/${id}/review`,{method:"POST",body:{status:st,note}});await Promise.all([loadIncidents(),loadOverview()])}catch(x){status(x.message,true)}return}const ban=e.target.closest("[data-sec-ban-user]");if(ban){document.getElementById("banAccount").value=ban.dataset.secBanUser;document.getElementById("banReason").focus();document.getElementById("banForm").scrollIntoView({behavior:"smooth",block:"center"});return}const lift=e.target.closest("[data-sec-lift]");if(lift){const reason=prompt("Lý do gỡ ban:","Đã xem xét và cho phép sử dụng lại tài khoản.");if(reason===null)return;try{const r=await req(`/api/store/admin/security/bans/${lift.dataset.secLift}/lift`,{method:"POST",body:{reason}});status(r.message);await Promise.all([loadBans(),loadOverview(),loadUsers()])}catch(x){status(x.message,true)}}}

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",buildUi,{once:true});else buildUi();
})();
