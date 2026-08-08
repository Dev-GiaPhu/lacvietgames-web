(() => {
  if(window.__LVGR2StatusCompat)return;
  window.__LVGR2StatusCompat=true;
  const rawFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{
    const response=await rawFetch(...args);
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
  const date=v=>v?new Date(v).toLocaleString('vi-VN'):'—';
  const CAP_NAMES={authWallet:'Tài khoản & ví',playTime:'PlayTime server',clientRewards:'Client reward nhỏ',serverVerified:'ServerVerified'};
  const CAP_HELP={
    authWallet:'Đọc thông tin tài khoản cơ bản và số dư để hiển thị trong game. Game không được sửa số dư.',
    playTime:'LacVietGames đo thời gian chơi phía server và tự xử lý reward PlayTime.',
    clientRewards:'Cho phép game gửi event reward nhỏ. Server vẫn quyết định số coin, cooldown và giới hạn.',
    serverVerified:'Dành cho win/competitive/reward giá trị cao; cần verifier backend tin cậy do Admin kiểm soát.'
  };
  let rows=[];

  function session(){if(window.LVGSession?.read)return window.LVGSession.read();for(const s of[sessionStorage,localStorage]){try{const r=s.getItem(KEY);if(r)return JSON.parse(r)}catch{}}return null}
  async function req(path,opt={}){const s=session();if(!s?.token)throw new Error('Bạn cần đăng nhập Publisher Center.');const r=await fetch(`${API}${path}`,{method:opt.method||'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.token}`},body:opt.body?JSON.stringify(opt.body):undefined});const p=await r.json().catch(()=>null);if(!r.ok||p?.success===false){const e=new Error(p?.message||'Không thể xử lý yêu cầu.');e.code=p?.code;throw e}return p}
  function status(v='',bad=false){const e=$('publisherIntegrationStatus');if(e){e.textContent=v;e.style.color=bad?'#ff9bab':'#83e6ae'}}
  function caps(c={}){return Object.entries(CAP_NAMES).filter(([k])=>!!c[k]).map(([k,n])=>`<span class="pub-int-cap">${esc(n)}</span>`).join('')||'<span class="pub-int-muted">Chưa có quyền</span>'}
  function hasExtra(x){const a=x.approved||{},r=x.requested||{};return Object.keys(CAP_NAMES).some(k=>!!r[k]&&!a[k])}

  function style(){if($('publisherIntegrationStyle'))return;const s=document.createElement('style');s.id='publisherIntegrationStyle';s.textContent=`
    .publisher-integration-card{margin-bottom:20px;min-width:0;overflow:hidden}.pub-int-list{display:grid;gap:14px}.pub-int-item{min-width:0;border:1px solid #2a3650;border-radius:17px;background:#0d1421;padding:16px;box-sizing:border-box}.pub-int-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.pub-int-top h3{margin:0 0 5px}.pub-int-game-mark{display:inline-flex;align-items:center;gap:6px;margin-bottom:5px;font-size:11px;font-weight:800;color:#91a6c7;text-transform:uppercase;letter-spacing:.06em}.pub-int-meta,.pub-int-muted{font-size:12px;color:#8391aa;line-height:1.6;overflow-wrap:anywhere}.pub-int-section{margin-top:13px;padding-top:13px;border-top:1px solid #202b3f}.pub-int-section-title{font-size:12px;font-weight:800;color:#d7dfed;margin-bottom:7px}.pub-int-caps{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.pub-int-cap{font-size:11px;border:1px solid #36506f;background:#101c2d;color:#a9c9f4;border-radius:999px;padding:5px 8px}.pub-int-form{display:grid;gap:10px;margin-top:10px}.pub-int-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pub-int-check{min-width:0;display:grid!important;grid-template-columns:auto minmax(0,1fr);gap:8px!important;align-items:start!important;background:#0a111c;border:1px solid #29364e;border-radius:11px;padding:10px!important;color:#cdd6e7!important}.pub-int-check input{width:auto!important;margin-top:2px}.pub-int-check b{display:block;font-size:12px}.pub-int-check small{display:block;margin-top:3px;color:#7f8da5;font-size:10px;line-height:1.45}.pub-int-check.locked{border-color:#285b42;background:#0c2018}.pub-int-check.locked small{color:#7fbd99}.pub-int-note{width:100%;box-sizing:border-box;min-height:68px;background:#09111d;border:1px solid #303d57;color:#e8edf7;border-radius:10px;padding:10px;font:inherit;resize:vertical}.pub-int-actions{display:flex;gap:8px;flex-wrap:wrap}.pub-int-approved{padding:11px;border:1px solid #285b42;background:#0c271a;border-radius:11px;color:#92e4b3;font-size:12px;line-height:1.6}.pub-int-warn{padding:11px;border:1px solid #6f4a27;background:#291b0d;border-radius:11px;color:#ffc77b;font-size:12px;line-height:1.6}.pub-int-pending{padding:11px;border:1px solid #36506f;background:#101c2d;border-radius:11px;color:#a9c9f4;font-size:12px;line-height:1.6}.pub-int-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere;word-break:break-all}.pub-int-kit{display:grid;gap:8px;margin-top:10px}.pub-int-code{width:100%;box-sizing:border-box;background:#080e17;border:1px solid #2d3a51;color:#a8efc2;border-radius:10px;padding:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;overflow-wrap:anywhere}.pub-int-own-id{padding:10px;border-radius:11px;background:#09111d;border:1px solid #24324a}.pub-int-separate{font-size:11px;color:#71829f;margin-top:4px}@media(max-width:700px){.pub-int-checks{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}

  function install(){style();const content=$('publisherContent');if(!content||$('publisherIntegrationCard'))return;const card=document.createElement('section');card.id='publisherIntegrationCard';card.className='portal-card publisher-integration-card';card.innerHTML=`<div class="portal-toolbar"><div><h2 style="margin:0">Tích hợp LacVietGames SDK</h2><small style="color:#8492ab">Mỗi game có Integration ID và bộ quyền riêng. Có thể xin thêm quyền bất kỳ lúc nào; quyền cũ không bị tắt khi chờ duyệt.</small></div><button id="refreshPublisherIntegrations" class="mini-btn" type="button">Làm mới</button></div><div id="publisherIntegrationStatus" class="portal-status"></div><div id="publisherIntegrationList" class="pub-int-list"></div>`;const stats=content.querySelector('.publisher-stats');if(stats)stats.insertAdjacentElement('afterend',card);else content.prepend(card);$('refreshPublisherIntegrations').onclick=load;card.addEventListener('click',actions);card.addEventListener('submit',submit);load()}

  async function load(){if(!session()?.token)return;status('Đang tải quyền tích hợp theo từng game...');try{rows=(await req('/api/store/publisher/integrations')).data||[];render();status('Đã đồng bộ quyền riêng của từng game.')}catch(e){status(e.message,true)}}

  function render(){const root=$('publisherIntegrationList');root.innerHTML=rows.map(x=>{
    const st=x.status||'NotRequested';
    return `<article class="pub-int-item" data-pub-int="${x.gameId}"><div class="pub-int-top"><div><div class="pub-int-game-mark">Cấu hình riêng cho game #${x.gameId}</div><h3>${esc(x.gameName)}</h3><div class="pub-int-meta">${esc(x.gameSlug)} · ${esc(x.gameStatus)} · ${st==='NotRequested'?'chưa đăng ký SDK':'cập nhật '+date(x.updatedAt)}</div><div class="pub-int-separate">Quyền và Integration ID của game này không dùng chung với game khác.</div></div><span class="status-chip ${String(st).toLowerCase()}">${esc(st)}</span></div>${viewFor(x)}</article>`;
  }).join('')||'<div class="portal-empty">Bạn chưa có game để đăng ký tích hợp SDK.</div>'}

  function viewFor(x){
    if(x.status==='Approved')return approvedView(x);
    if(x.status==='Pending')return pendingView(x);
    if(x.status==='Suspended')return suspendedView(x)+requestForm(x,true);
    return requestForm(x,false);
  }

  function capabilityForm(x,mode){
    const approved=x.approved||{},requested=x.requested||{};
    const base=mode==='initial'?requested:(x.reviewPending?requested:approved);
    const boxes=Object.entries(CAP_NAMES).map(([k,name])=>{
      const locked=mode!=='initial'&&!!approved[k];
      const checked=locked||!!base[k]||(mode==='initial'&&(k==='authWallet'||k==='playTime'));
      return `<label class="pub-int-check ${locked?'locked':''}"><input data-c="${k}" type="checkbox" ${checked?'checked':''} ${locked?'disabled':''}><span><b>${esc(name)}${locked?' · Đã duyệt':''}</b><small>${esc(CAP_HELP[k])}</small></span></label>`;
    }).join('');
    const button=mode==='initial'?(x.status==='Rejected'||x.status==='Suspended'?'Gửi lại đăng ký':'Gửi đăng ký tích hợp'):(x.reviewPending?'Cập nhật yêu cầu đang chờ':'Gửi yêu cầu bổ sung quyền');
    return `<form class="pub-int-form" data-int-form="${x.gameId}" data-int-mode="${mode}"><div class="pub-int-checks">${boxes}</div><textarea class="pub-int-note" data-note maxlength="1200" placeholder="Mô tả game cần dùng các quyền này như thế nào...">${esc(x.publisherNote||'')}</textarea><div class="pub-int-actions"><button class="mini-btn primary" type="submit">${button}</button></div></form>`;
  }

  function requestForm(x,resubmit){return `<div class="pub-int-section"><div class="pub-int-section-title">Chọn quyền cho riêng ${esc(x.gameName)}</div><div class="pub-int-warn">Chỉ chọn tính năng game thực sự cần. Số Lạc Coin, reward rule và logic bảo mật vẫn do LacVietGames server quyết định.</div>${capabilityForm(x,'initial')}${x.adminNote?`<div class="pub-int-meta">Phản hồi Admin: ${esc(x.adminNote)}</div>`:''}</div>`}
  function pendingView(x){return `<div class="pub-int-section"><div class="pub-int-section-title">Quyền đang yêu cầu</div><div class="pub-int-caps">${caps(x.requested)}</div><div class="pub-int-warn">Đăng ký ban đầu của game này đang chờ Admin duyệt. Chưa có quyền production được bật.</div>${x.publisherNote?`<p class="pub-int-meta">Ghi chú: ${esc(x.publisherNote)}</p>`:''}</div>`}

  function approvedView(x){
    const pending=x.reviewPending&&hasExtra(x);
    return `<div class="pub-int-section"><div class="pub-int-section-title">Quyền đang hoạt động</div><div class="pub-int-caps">${caps(x.approved)}</div><div class="pub-int-approved">Các quyền trên đã được Admin duyệt và vẫn hoạt động${pending?' trong lúc quyền mới đang chờ xét':''}.</div></div>${pending?`<div class="pub-int-section"><div class="pub-int-section-title">Quyền bổ sung đang chờ duyệt</div><div class="pub-int-caps">${caps(x.requested)}</div><div class="pub-int-pending">Admin đang xét phần quyền bổ sung. Integration ID hiện tại và các quyền cũ không thay đổi.</div></div>`:''}<div class="pub-int-section"><div class="pub-int-section-title">Yêu cầu thêm quyền cho game này</div>${capabilityForm(x,'expand')}</div><div class="pub-int-section pub-int-kit"><div class="pub-int-section-title">Bộ tích hợp riêng của game</div><div class="pub-int-approved">Integration ID là định danh công khai của <b>${esc(x.gameName)}</b>, không phải secret và không dùng cho game khác.</div><div class="pub-int-meta">Integration ID</div><div class="pub-int-code pub-int-id">${esc(x.integrationId||'')}</div><div class="pub-int-actions"><button class="mini-btn" type="button" data-copy-id="${x.gameId}">Copy Integration ID</button><button class="mini-btn primary" type="button" data-kit="${x.gameId}">Lấy bộ tích hợp Unity</button></div><div data-kit-output></div></div>${x.adminNote?`<p class="pub-int-meta">Admin: ${esc(x.adminNote)}</p>`:''}`;
  }
  function suspendedView(x){return `<div class="pub-int-section"><div class="pub-int-warn">Admin đã khóa quyền SDK của riêng game này. Các game khác không bị ảnh hưởng.${x.adminNote?`<br>Lý do: ${esc(x.adminNote)}`:''}</div></div>`}

  async function submit(e){
    const form=e.target.closest('[data-int-form]');if(!form)return;e.preventDefault();
    const gameId=Number(form.dataset.intForm),row=rows.find(x=>Number(x.gameId)===gameId),get=k=>{
      const input=form.querySelector(`[data-c="${k}"]`);return !!input?.checked;
    };
    const body={gameId,authWallet:get('authWallet'),playTime:get('playTime'),clientRewards:get('clientRewards'),serverVerified:get('serverVerified'),note:form.querySelector('[data-note]')?.value.trim()||null};
    // Disabled approved checkboxes remain checked, but keep an explicit merge as defense against DOM edits.
    if(row?.status==='Approved'){for(const k of Object.keys(CAP_NAMES))if(row.approved?.[k])body[k]=true;}
    try{const p=await req('/api/store/publisher/integrations',{method:'POST',body});status(p.message);await load()}catch(x){status(x.message,true)}
  }

  async function actions(e){
    const copy=e.target.closest('[data-copy-id]');if(copy){const x=rows.find(r=>Number(r.gameId)===Number(copy.dataset.copyId));if(x?.integrationId){await navigator.clipboard.writeText(x.integrationId);status(`Đã copy Integration ID của ${x.gameName}.`)}return}
    const kit=e.target.closest('[data-kit]');if(kit){const gameId=Number(kit.dataset.kit),row=kit.closest('[data-pub-int]'),out=row?.querySelector('[data-kit-output]');try{const d=(await req(`/api/store/publisher/integrations/${gameId}/kit`)).data||{};if(out)out.innerHTML=`<div class="pub-int-meta">Unity Package Manager → Add package from git URL:</div><div class="pub-int-code">${esc(d.unityPackageGitUrl||'')}</div><div class="pub-int-actions"><button class="mini-btn" type="button" data-copy-package="${gameId}">Copy Package URL</button><button class="mini-btn" type="button" data-download-kit="${gameId}">Tải cấu hình của game này</button></div>`;row.dataset.packageUrl=d.unityPackageGitUrl||'';row.dataset.kitJson=JSON.stringify(d)}catch(x){status(x.message,true)}return}
    const pkg=e.target.closest('[data-copy-package]');if(pkg){const row=pkg.closest('[data-pub-int]');if(row?.dataset.packageUrl){await navigator.clipboard.writeText(row.dataset.packageUrl);status('Đã copy Unity Package URL.')}return}
    const dl=e.target.closest('[data-download-kit]');if(dl){const row=dl.closest('[data-pub-int]');if(!row?.dataset.kitJson)return;const d=JSON.parse(row.dataset.kitJson),blob=new Blob([JSON.stringify({integrationId:d.integrationId,gameId:d.gameId,gameSlug:d.gameSlug,packageGitUrl:d.unityPackageGitUrl,capabilities:d.capabilities},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`lacvietgames-${d.gameSlug||d.gameId}-integration.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('lvg:session-hydrated',()=>{if(!$('publisherIntegrationCard'))install();else load()});
})();
