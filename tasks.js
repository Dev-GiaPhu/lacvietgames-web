(() => {
  const API=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const fmt=n=>Number(n||0).toLocaleString("vi-VN");
  const minutes=s=>Math.max(0,Math.floor(Number(s||0)/60));
  let bootAttempts=0;

  function read(){
    if(window.LVGSession?.read)return window.LVGSession.read();
    for(const st of[localStorage,sessionStorage]){
      try{const raw=st.getItem("lacvietgamesStoreSession");if(raw)return JSON.parse(raw)}catch{}
    }
    return null;
  }

  function ensureShell(){
    const app=document.getElementById("app");
    if(!app)return null;
    if(!app.querySelector("#tasksGrid")){
      app.className="page tasks-shell";
      app.innerHTML=`<div class="tasks-head"><div><span class="eyebrow">MISSIONS & EVENTS</span><h1>Nhiệm vụ & Sự kiện</h1><p>Chơi game trong thời gian yêu cầu để nhận Lạc Coin. Thời gian được server ghi nhận bằng play session.</p></div><a class="btn btn-secondary" href="./catalog.html?type=web">Khám phá Web Game</a></div><div id="tasksGrid" class="tasks-grid"><div class="tasks-empty">Đang tải...</div></div>`;
    }
    return document.getElementById("tasksGrid");
  }

  async function load(){
    const root=ensureShell();
    if(!root)return;
    const s=read();
    if(!s?.token){
      root.innerHTML='<div class="tasks-empty"><h3>Đăng nhập để xem nhiệm vụ</h3><p>Tiến độ và phần thưởng được lưu theo tài khoản.</p><button class="btn btn-primary" data-open-server-auth>Đăng nhập / Đăng ký</button></div>';
      return;
    }
    root.innerHTML='<div class="tasks-empty">Đang tải nhiệm vụ...</div>';
    try{
      const r=await fetch(`${API}/api/store/tasks`,{headers:{Authorization:`Bearer ${s.token}`}});
      const p=await r.json().catch(()=>null);
      if(!r.ok||p?.success===false)throw new Error(p?.message||"Không tải được nhiệm vụ.");
      const items=p.data||[];
      root.innerHTML=items.length?items.map(card).join(""):'<div class="tasks-empty">Hiện chưa có nhiệm vụ hoặc sự kiện đang diễn ra.</div>';
    }catch(e){
      root.innerHTML=`<div class="tasks-empty" style="color:#ff9eaa">${esc(e.message)}</div>`;
    }
  }

  function card(t){
    const done=!!t.rewardedAt;
    const progress=Math.max(0,Math.min(100,Number(t.progressPercent||0)));
    const play=t.gameSlug
      ? `<a class="btn btn-primary" href="./play.html?id=${encodeURIComponent(t.gameSlug)}">▶ Chơi ${esc(t.gameName||"")}</a>`
      : `<a class="btn btn-primary" href="./catalog.html?type=web">▶ Chọn Web Game</a>`;
    const action=t.actionUrl?`<a class="btn btn-secondary" href="${esc(t.actionUrl)}">Xem chi tiết</a>`:"";
    return `<article class="task-card">${t.imageUrl?`<div class="task-image" style="background-image:url('${esc(t.imageUrl)}')"></div>`:'<div class="task-image">🎯</div>'}<div class="task-body"><div class="task-meta"><span>${t.gameName?esc(t.gameName):"Mọi game"}</span>${t.endsAt?`<span>Đến ${new Date(t.endsAt).toLocaleString("vi-VN")}</span>`:""}</div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><div class="task-progress"><span style="width:${progress}%"></span></div><div class="task-row"><span>${fmt(minutes(t.progressSeconds))}/${fmt(minutes(t.requiredSeconds))} phút</span><span class="task-reward">+${fmt(t.rewardCoin)} LC</span></div><div class="task-actions">${done?'<span class="task-complete">✓ Đã hoàn thành & nhận thưởng</span>':play}${action}</div></div></article>`;
  }

  function bootWhenStoreReady(){
    if(document.querySelector("#siteHeader .site-header")||bootAttempts>=40){load();return;}
    bootAttempts++;
    setTimeout(bootWhenStoreReady,100);
  }

  window.addEventListener("lvg:session-hydrated",load);
  window.addEventListener("lvg:play-session-ended",load);
  window.addEventListener("lvg:session-invalid",load);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootWhenStoreReady,{once:true});else bootWhenStoreReady();
})();
