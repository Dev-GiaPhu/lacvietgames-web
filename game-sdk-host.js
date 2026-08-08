(() => {
  if (document.body.dataset.page !== "play") return;
  const API=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const gameSlug=new URLSearchParams(location.search).get("id")||"";
  let pendingLoginRequestId=null,playtimeTimer=null,playtimeBusy=false,presentedIntegrationId="",runtime=null,runtimePromise=null,loginPrompted=false;
  const inflightClaims=new Set();

  function account(){if(window.LVGSession?.read)return window.LVGSession.read();for(const s of[localStorage,sessionStorage]){try{const r=s.getItem("lacvietgamesStoreSession");if(r)return JSON.parse(r)}catch{}}return null}
  function frame(){return document.querySelector(".play-shell iframe")}
  function origin(){const f=frame();if(!f?.src)return"*";try{return new URL(f.src,location.href).origin}catch{return"*"}}
  function send(data){const f=frame();if(f?.contentWindow)f.contentWindow.postMessage(data,origin())}
  async function api(path,opt={}){const a=account();if(!a?.token)throw Object.assign(new Error("Bạn cần đăng nhập LacVietGames."),{code:"AUTH_REQUIRED",status:401});let r;try{r=await fetch(`${API}${path}`,{method:opt.method||"GET",headers:{"Content-Type":"application/json",Authorization:`Bearer ${a.token}`},body:opt.body?JSON.stringify(opt.body):undefined})}catch(cause){throw Object.assign(new Error("Mất kết nối tới LacVietGames server."),{code:"NETWORK_ERROR",status:0,cause})}const p=await r.json().catch(()=>null);if(!r.ok||p?.success===false){const e=new Error(p?.message||"LacVietGames server từ chối yêu cầu.");e.code=p?.code||`HTTP_${r.status}`;e.status=r.status;e.payload=p;throw e}return p}
  function cacheBalance(v){if(v==null)return;try{window.LVGSession?.cacheServerAccount?.({coinBalance:Number(v)})}catch{}}
  function integrationError(code="GAME_INTEGRATION_NOT_APPROVED",message="Game chưa được Admin cấp quyền LacVietGames SDK."){const e=new Error(message);e.code=code;e.status=403;return e}

  async function ensureRuntime(integrationId=presentedIntegrationId){
    integrationId=String(integrationId||"").trim();
    if(!integrationId)throw integrationError("INTEGRATION_ID_REQUIRED","Build game chưa cấu hình Integration ID do Admin cấp.");
    if(presentedIntegrationId&&integrationId!==presentedIntegrationId)throw integrationError("INTEGRATION_ID_MISMATCH","Integration ID trong request không khớp ID mà build đã đăng ký khi khởi tạo SDK.");
    if(runtime&&runtime.integrationId===integrationId)return runtime;
    if(!account()?.token)throw Object.assign(new Error("Bạn cần đăng nhập trước khi xác minh tích hợp."),{code:"AUTH_REQUIRED",status:401});
    if(runtimePromise)return runtimePromise;
    runtimePromise=(async()=>{
      const p=await api(`/api/store/game-integrations/runtime?gameSlug=${encodeURIComponent(gameSlug)}`),d=p.data||{};
      if(!d.integrationId||d.integrationId!==integrationId)throw integrationError("INTEGRATION_ID_MISMATCH","Integration ID không thuộc game này hoặc đã bị Admin thay đổi/khóa.");
      runtime={integrationId:d.integrationId,gameId:Number(d.gameId||0),gameSlug:d.gameSlug||gameSlug,capabilities:d.capabilities||{}};
      return runtime;
    })();
    try{return await runtimePromise}finally{runtimePromise=null}
  }

  function requireCap(rt,key,message){if(!rt?.capabilities?.[key])throw integrationError("INTEGRATION_CAPABILITY_DENIED",message)}
  async function wallet(integrationId=presentedIntegrationId){const rt=await ensureRuntime(integrationId);requireCap(rt,"authWallet","Admin chưa cấp quyền tài khoản & ví cho game này.");const p=await api(`/api/store/game-sdk/wallet?gameSlug=${encodeURIComponent(gameSlug)}&integrationId=${encodeURIComponent(rt.integrationId)}`),d=p.data||{};cacheBalance(d.coinBalance);return d}
  function openLogin(){
    if(loginPrompted)return;
    loginPrompted=true;
    let tries=0;
    const attempt=()=>{const b=document.querySelector("[data-open-server-auth]");if(b){b.click();return}if(++tries<8)setTimeout(attempt,250)};
    attempt();
  }

  async function announceReady(){
    if(!presentedIntegrationId){send({type:"LVG_HOST_READY",loggedIn:!!account()?.token,approved:false,code:"INTEGRATION_ID_REQUIRED",message:"Build chưa có Integration ID."});return false}
    if(!account()?.token)return false;
    try{const rt=await ensureRuntime(presentedIntegrationId);send({type:"LVG_HOST_READY",loggedIn:true,approved:true,capabilities:rt.capabilities});return true}
    catch(e){send({type:"LVG_HOST_READY",loggedIn:true,approved:false,code:e.code||"GAME_INTEGRATION_NOT_APPROVED",message:e.message});return false}
  }

  async function answerAuth(id,integrationId=presentedIntegrationId){try{const d=await wallet(integrationId);send({type:"LVG_AUTH_RESULT",requestId:id,success:true,accountId:Number(d.accountId||0),displayName:d.displayName||"",email:d.email||"",coinBalance:Number(d.coinBalance||0)});return true}catch(e){if(e.code==="AUTH_REQUIRED")return false;send({type:"LVG_AUTH_RESULT",requestId:id,success:false,code:e.code||"AUTH_ERROR",message:e.message,ban:e.payload?.data||null});return false}}
  async function autoAuthenticate(){
    if(!presentedIntegrationId)return;
    if(!account()?.token){pendingLoginRequestId="auto-auth";openLogin();return}
    loginPrompted=false;
    const ready=await announceReady();
    if(!ready)return;
    try{const rt=runtime||await ensureRuntime(presentedIntegrationId);if(rt.capabilities?.authWallet)await answerAuth("auto-auth",presentedIntegrationId)}catch{}
  }
  async function requestAuth(id,integrationId){if(integrationId&&integrationId!==presentedIntegrationId){send({type:"LVG_AUTH_RESULT",requestId:id,success:false,code:"INTEGRATION_ID_MISMATCH",message:"Integration ID không khớp."});return}if(await answerAuth(id,integrationId))return;pendingLoginRequestId=id;openLogin()}
  async function requestWallet(id,integrationId){try{const d=await wallet(integrationId);send({type:"LVG_WALLET_RESULT",requestId:id,success:true,accountId:Number(d.accountId||0),displayName:d.displayName||"",email:d.email||"",coinBalance:Number(d.coinBalance||0)})}catch(e){send({type:"LVG_WALLET_RESULT",requestId:id,success:false,code:e.code||"WALLET_ERROR",message:e.message,ban:e.payload?.data||null})}}

  async function requestIdentity(id,integrationId){const play=window.LVGPlaySession;if(!play?.sessionId||!play?.clientToken){send({type:"LVG_IDENTITY_RESULT",requestId:id,success:false,code:"PLAY_SESSION_REQUIRED",message:"Hãy bắt đầu gameplay trước khi xin Game Identity Token."});return}try{const rt=await ensureRuntime(integrationId);requireCap(rt,"serverVerified","Admin chưa cấp ServerVerified cho game này.");const p=await api("/api/store/game-sdk/identity-token",{method:"POST",body:{sessionId:play.sessionId,clientToken:play.clientToken,integrationId:rt.integrationId}}),d=p.data||{};send({type:"LVG_IDENTITY_RESULT",requestId:id,success:true,identityToken:d.identityToken||"",gameId:Number(d.gameId||0),gameSlug:d.gameSlug||"",playSessionId:d.playSessionId||"",expiresAt:d.expiresAt||""})}catch(e){send({type:"LVG_IDENTITY_RESULT",requestId:id,success:false,code:e.code||"IDENTITY_ERROR",message:e.message,ban:e.payload?.data||null})}}

  function rid(){if(crypto?.randomUUID)return crypto.randomUUID();const b=new Uint8Array(16);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("")}
  const wait=ms=>new Promise(r=>setTimeout(r,ms));const retryable=e=>e?.code==="NETWORK_ERROR"||Number(e?.status||0)>=500;
  async function claimEvent(eventKey,unityId,integrationId){const play=window.LVGPlaySession;if(!play?.sessionId||!play?.clientToken){send({type:"LVG_REWARD_RESULT",requestId:unityId,success:false,code:"PLAY_SESSION_REQUIRED",message:"Hãy bắt đầu gameplay trước khi nhận reward.",eventKey});return}if(inflightClaims.has(unityId))return;inflightClaims.add(unityId);const serverId=rid();let last=null;try{const rt=await ensureRuntime(integrationId);requireCap(rt,"clientRewards","Admin chưa cấp quyền Client reward cho game này.");for(let n=1;n<=3;n++){try{const p=await api("/api/store/game-sdk/rewards/claim",{method:"POST",body:{sessionId:play.sessionId,clientToken:play.clientToken,eventKey,requestId:serverId}}),d=p.data||{};cacheBalance(d.coinBalance);send({type:"LVG_REWARD_RESULT",requestId:unityId,success:true,code:p.code||"REWARD_GRANTED",message:p.message||"",eventKey:d.eventKey||eventKey,title:d.title||"",rewardCoin:Number(d.rewardCoin||0),coinBalance:Number(d.coinBalance||0),elapsedSeconds:Number(d.elapsedSeconds||0),alreadyProcessed:!!d.alreadyProcessed});return}catch(e){last=e;if(!retryable(e)||n===3)break;await wait(n===1?350:900)}}send({type:"LVG_REWARD_RESULT",requestId:unityId,success:false,code:last?.code||"REWARD_ERROR",message:last?.message||"Không thể xác nhận reward.",eventKey,ban:last?.payload?.data||null})}catch(e){send({type:"LVG_REWARD_RESULT",requestId:unityId,success:false,code:e.code||"REWARD_ERROR",message:e.message,eventKey})}finally{inflightClaims.delete(unityId)}}

  async function claimPlaytime(){if(playtimeBusy||document.hidden||!presentedIntegrationId)return;const play=window.LVGPlaySession;if(!play?.sessionId||!play?.clientToken||!account()?.token)return;playtimeBusy=true;try{const rt=await ensureRuntime(presentedIntegrationId);if(!rt.capabilities?.playTime)return;const p=await api("/api/store/game-sdk/rewards/claim-playtime",{method:"POST",body:{sessionId:play.sessionId,clientToken:play.clientToken}}),d=p.data||{};cacheBalance(d.coinBalance);for(const r of(d.rewards||[]))send({type:"LVG_REWARD_RESULT",requestId:"playtime",success:true,code:"PLAYTIME_REWARD_GRANTED",eventKey:r.eventKey||"",title:r.title||"",rewardCoin:Number(r.rewardCoin||0),coinBalance:Number(r.coinBalance??d.coinBalance??0),elapsedSeconds:Number(d.elapsedSeconds||0),alreadyProcessed:false})}catch(e){if(!["PLAY_SESSION_REQUIRED","PLAY_SESSION_NOT_ACTIVE","PLAY_SESSION_STALE","AUTH_REQUIRED","ACCOUNT_BANNED","GAME_INTEGRATION_NOT_APPROVED"].includes(e.code))console.warn("LacVietGames playtime reward check failed",e);if(e.code==="ACCOUNT_BANNED")send({type:"LVG_WALLET_RESULT",requestId:"ban",success:false,code:e.code,message:e.message,ban:e.payload?.data||null})}finally{playtimeBusy=false}}
  function startChecks(){clearInterval(playtimeTimer);claimPlaytime();playtimeTimer=setInterval(claimPlaytime,30000)}function stopChecks(){clearInterval(playtimeTimer);playtimeTimer=null}

  window.addEventListener("message",e=>{const f=frame();if(!f||e.source!==f.contentWindow)return;const d=e.data||{},t=d.type;if(t==="LVG_SDK_READY"){presentedIntegrationId=String(d.integrationId||"").trim();runtime=null;runtimePromise=null;autoAuthenticate();return}if(t==="LVG_AUTH_REQUEST")return requestAuth(String(d.requestId||"auth"),String(d.integrationId||""));if(t==="LVG_WALLET_REQUEST")return requestWallet(String(d.requestId||"wallet"),String(d.integrationId||""));if(t==="LVG_IDENTITY_REQUEST")return requestIdentity(String(d.requestId||"identity"),String(d.integrationId||""));if(t==="LVG_REWARD_CLAIM")claimEvent(String(d.eventKey||"").trim().toLowerCase(),String(d.requestId||"reward"),String(d.integrationId||""))});
  window.addEventListener("lvg:session-hydrated",async()=>{runtime=null;if(!presentedIntegrationId)return;if(account()?.token)loginPrompted=false;const ready=await announceReady();if(pendingLoginRequestId&&account()?.token){const id=pendingLoginRequestId;pendingLoginRequestId=null;await answerAuth(id,presentedIntegrationId)}else if(ready&&account()?.token){try{const rt=runtime||await ensureRuntime(presentedIntegrationId);if(rt.capabilities?.authWallet)await answerAuth("auto-auth",presentedIntegrationId)}catch{}}if(window.LVGPlaySession)claimPlaytime()});
  window.addEventListener("lvg:play-session-started",startChecks);window.addEventListener("lvg:play-session-ended",stopChecks);window.addEventListener("pagehide",stopChecks);document.addEventListener("visibilitychange",()=>{if(!document.hidden&&window.LVGPlaySession)claimPlaytime()});
  window.LVGGameSdkHost={loadWallet:()=>wallet(presentedIntegrationId),claimPlaytimeRewards:claimPlaytime};
})();