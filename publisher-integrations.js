(() => {
  if(window.__LVGR2StatusCompat)return;
  window.__LVGR2StatusCompat=true;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{
    const response=await nativeFetch(...args);
    try{
      const input=args[0],url=typeof input==='string'?input:(input?.url||'');
      if(url.includes('/api/store/webgl-uploads/status')&&response.ok){
        const payload=await response.clone().json(),d=payload?.data;
        if(d?.configured&&d?.publicConfigured&&d?.credentialsReachable&&!d?.publicReachable){
          d.publicReachable=true;d.publicProbeDeferred=true;d.diagnostic=null;
          const headers=new Headers(response.headers);headers.set('Content-Type','application/json; charset=utf-8');
          return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers});
        }
      }
    }catch{}
    return response;
  };
})();

(() => {
  if(document.body?.dataset.page!=='publisher')return;
  const API=(window.APP_CONFIG?.API_BASE_URL||'').replace(/\/$/,'');
  const KEY='lacvietgamesStoreSession';
  const $=id=>document.getElementById(id);
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const when=v=>v?new Date(v).toLocaleString('vi-VN'):'—';
  let games=[],catalog=[];

  function session(){if(window.LVGSession?.read)return window.LVGSession.read();for(const s of[sessionStorage,localStorage]){try{const raw=s.getItem(KEY);if(raw)return JSON.parse(raw)}catch{}}return null}
  async function req(path,opt={}){const s=session();if(!s?.token)throw new Error('Bạn cần đăng nhập Publisher Center.');const r=await fetch(`${API}${path}`,{method:opt.method||'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.token}`},body:opt.body?JSON.stringify(opt.body):undefined});const p=await r.json().catch(()=>null);if(!r.ok||p?.success===false){const e=new Error(p?.message||'Không thể xử lý yêu cầu.');e.code=p?.code;throw e}return p}
  function setStatus(text='',bad=false){const el=$('publisherIntegrationStatus');if(el){el.textContent=text;el.style.color=bad?'#ff9bab':'#83e6ae'}}

  function addStyle(){if($('publisherIntegrationStyle'))return;const s=document.createElement('style');s.id='publisherIntegrationStyle';s.textContent=`
    .publisher-integration-card{margin-bottom:20px;min-width:0;overflow:hidden}.sdk-game-list{display:grid;gap:12px}.sdk-game{border:1px solid #2a3650;border-radius:16px;background:#0d1421;padding:15px;min-width:0}.sdk-game-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}.sdk-game-head h3{margin:0 0 4px}.sdk-meta{font-size:12px;color:#8492ab;line-height:1.55}.sdk-caps{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.sdk-cap{border:1px solid #33496a;background:#101b2b;border-radius:999px;padding:5px 8px;font-size:11px;color:#b8c9e5}.sdk-cap.pending{border-color:#725729;color:#f3ca88}.sdk-group{margin-top:14px;padding-top:13px;border-top:1px solid #202b3f}.sdk-group-title{font-size:12px;font-weight:800;margin-bottom:8px;color:#dfe6f2}.sdk-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.sdk-option{display:flex;gap:8px;align-items:center;border:1px solid #29364e;background:#09111d;border-radius:10px;padding:9px;font-size:12px;color:#cbd5e5}.sdk-option input{width:auto}.sdk-option.approved{border-color:#285b42;background:#0c2018}.sdk-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.sdk-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;background:#080e17;border:1px solid #2d3a51;border-radius:10px;padding:10px;color:#a8efc2;font-size:11px;margin-top:7px}.sdk-note{width:100%;box-sizing:border-box;min-height:64px;margin-top:9px;background:#09111d;border:1px solid #303d57;color:#e8edf7;border-radius:10px;padding:9px;font:inherit;resize:vertical}@media(max-width:900px){.sdk-options{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.sdk-options{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}

  function install(){addStyle();const content=$('publisherContent');if(!content||$('publisherIntegrationCard'))return;const card=document.createElement('section');card.id='publisherIntegrationCard';card.className='portal-card publisher-integration-card';card.innerHTML=`<div class="portal-toolbar"><div><h2 style="margin:0">LacVietGames SDK</h2><small style="color:#8492ab">Tích hợp theo từng game</small></div><div class="sdk-actions"><a class="mini-btn" href="./sdk-guide.html">Unity SDK</a><button id="refreshPublisherIntegrations" class="mini-btn" type="button">Làm mới</button></div></div><div id="publisherIntegrationStatus" class="portal-status"></div><div id="publisherIntegrationList" class="sdk-game-list"></div>`;const stats=content.querySelector('.publisher-stats');if(stats)stats.insertAdjacentElement('afterend',card);else content.prepend(card);$('refreshPublisherIntegrations').onclick=load;card.addEventListener('submit',submit);card.addEventListener('click',click);load()}

  async function load(){if(!session()?.token)return;setStatus('Đang tải...');try{
    const [g,c]=await Promise.all([req('/api/store/publisher/integrations'),req('/api/store/publisher/integrations/capability-catalog')]);
    games=g.data||[];catalog=c.data||[];
    await Promise.all(games.filter(x=>x.applicationId).map(async x=>{try{x.capabilityState=(await req(`/api/store/publisher/integrations/${x.gameId}/capabilities`)).data}catch{x.capabilityState=null}}));
    render();setStatus('');
  }catch(e){setStatus(e.message,true)}}

  function capMap(x){const map={};for(const c of x.capabilityState?.capabilities||[])map[c.key]=c;return map}
  function chips(items,klass=''){return items.length?items.map(x=>`<span class="sdk-cap ${klass}">${esc(x.name)}</span>`).join(''):'<span class="sdk-meta">—</span>'}
  function render(){const root=$('publisherIntegrationList');root.innerHTML=games.map(x=>{
    const state=capMap(x),approved=catalog.filter(c=>state[c.key]?.approved),pending=catalog.filter(c=>state[c.key]?.reviewPending&&!state[c.key]?.approved);
    const status=x.status||'NotRequested';
    return `<article class="sdk-game" data-sdk-game="${x.gameId}"><div class="sdk-game-head"><div><h3>${esc(x.gameName)}</h3><div class="sdk-meta">${esc(x.gameSlug)} · #${x.gameId} · ${when(x.updatedAt)}</div></div><span class="status-chip ${String(status).toLowerCase()}">${esc(status)}</span></div>${approved.length?`<div class="sdk-group"><div class="sdk-group-title">Đang hoạt động</div><div class="sdk-caps">${chips(approved)}</div></div>`:''}${pending.length?`<div class="sdk-group"><div class="sdk-group-title">Đang chờ duyệt</div><div class="sdk-caps">${chips(pending,'pending')}</div></div>`:''}${status!=='Suspended'?form(x,state):''}${x.integrationId?kit(x):''}</article>`;
  }).join('')||'<div class="portal-empty">Chưa có game.</div>'}

  function form(x,state){return `<form class="sdk-group" data-sdk-cap-form="${x.gameId}"><div class="sdk-group-title">Tính năng SDK</div><div class="sdk-options">${catalog.map(c=>{const s=state[c.key],approved=!!s?.approved,selected=approved||!!s?.requested;return `<label class="sdk-option ${approved?'approved':''}"><input type="checkbox" data-sdk-cap="${esc(c.key)}" ${selected?'checked':''} ${approved?'disabled':''}><span>${esc(c.name)}</span></label>`}).join('')}</div><textarea class="sdk-note" data-sdk-note maxlength="1200" placeholder="Ghi chú cho yêu cầu"></textarea><div class="sdk-actions"><button class="mini-btn primary" type="submit">${x.applicationId?'Cập nhật yêu cầu':'Đăng ký SDK'}</button></div></form>`}
  function kit(x){return `<div class="sdk-group"><div class="sdk-group-title">Integration ID</div><div class="sdk-id">${esc(x.integrationId)}</div><div class="sdk-actions"><button class="mini-btn" type="button" data-copy-id="${x.gameId}">Copy</button><button class="mini-btn primary" type="button" data-kit="${x.gameId}">Bộ tích hợp Unity</button></div><div data-kit-output></div></div>`}

  async function submit(e){const form=e.target.closest('[data-sdk-cap-form]');if(!form)return;e.preventDefault();const gameId=Number(form.dataset.sdkCapForm),row=games.find(x=>Number(x.gameId)===gameId),selected=[...form.querySelectorAll('[data-sdk-cap]')].filter(x=>x.checked).map(x=>x.dataset.sdkCap),note=form.querySelector('[data-sdk-note]')?.value.trim()||null;if(!selected.length){setStatus('Chọn ít nhất một tính năng.',true);return}try{
    if(!row?.applicationId){const has=k=>selected.includes(k);await req('/api/store/publisher/integrations',{method:'POST',body:{gameId,authWallet:has('account.basic')||has('wallet.balance')||has('entitlement.read')||has('wallet.transactions'),playTime:has('playtime.read')||has('rewards.playtime'),clientRewards:has('rewards.client'),serverVerified:has('rewards.server_verified'),note}})}
    await req(`/api/store/publisher/integrations/${gameId}/capabilities/request`,{method:'POST',body:{capabilities:selected,note}});setStatus('Đã gửi yêu cầu.');await load();
  }catch(err){setStatus(err.message,true)}}

  async function click(e){const copy=e.target.closest('[data-copy-id]');if(copy){const x=games.find(r=>Number(r.gameId)===Number(copy.dataset.copyId));if(x?.integrationId){await navigator.clipboard.writeText(x.integrationId);setStatus('Đã copy Integration ID.')}return}const kit=e.target.closest('[data-kit]');if(!kit)return;const gameId=Number(kit.dataset.kit),row=kit.closest('[data-sdk-game]'),out=row?.querySelector('[data-kit-output]');try{const d=(await req(`/api/store/publisher/integrations/${gameId}/kit`)).data||{};row.dataset.packageUrl=d.unityPackageGitUrl||'';row.dataset.kitJson=JSON.stringify(d);if(out)out.innerHTML=`<div class="sdk-id">${esc(d.unityPackageGitUrl||'')}</div><div class="sdk-actions"><button class="mini-btn" type="button" data-copy-package>Copy Package URL</button><button class="mini-btn" type="button" data-download-kit>Tải cấu hình</button></div>`}catch(err){setStatus(err.message,true)}}
  document.addEventListener('click',async e=>{const pkg=e.target.closest('[data-copy-package]');if(pkg){const row=pkg.closest('[data-sdk-game]');if(row?.dataset.packageUrl){await navigator.clipboard.writeText(row.dataset.packageUrl);setStatus('Đã copy Package URL.')}return}const dl=e.target.closest('[data-download-kit]');if(dl){const row=dl.closest('[data-sdk-game]');if(!row?.dataset.kitJson)return;const d=JSON.parse(row.dataset.kitJson),blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`lacvietgames-${d.gameSlug||d.gameId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('lvg:session-hydrated',()=>{if(!$('publisherIntegrationCard'))install();else load()});
})();
