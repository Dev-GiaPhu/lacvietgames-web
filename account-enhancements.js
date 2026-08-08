(() => {
  const apiBase=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
  const COOKIE_SENTINEL=window.LVGSession?.cookieSentinel||"cookie.session";
  const readSession=()=>window.LVGSession?.read?.()||(()=>{try{const raw=sessionStorage.getItem("lacvietgamesStoreSession");return raw?JSON.parse(raw):null}catch{return null}})();
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  async function api(path,{method="GET",body,auth=true}={}){
    const session=readSession();
    if(auth&&!session?.token)throw Object.assign(new Error("Bạn cần đăng nhập."),{status:401,code:"AUTH_REQUIRED"});
    const headers={"Content-Type":"application/json","Accept":"application/json"};
    if(auth&&session?.token&&session.token!==COOKIE_SENTINEL)headers.Authorization=`Bearer ${session.token}`;
    const response=await fetch(`${apiBase}${path}`,{method,credentials:"include",cache:"no-store",headers,body:body?JSON.stringify(body):undefined});
    const payload=await response.json().catch(()=>null);
    if(!response.ok||payload?.success===false)throw Object.assign(new Error(payload?.message||"Yêu cầu không thành công."),{status:response.status,code:payload?.code});
    return payload;
  }

  const style=document.createElement("style");
  style.id="accountEnhancementTheme";
  style.textContent=`
    .auth-link-button{border:0;background:none;color:#e9c15f;font:inherit;padding:0;cursor:pointer;font-weight:700;text-align:left}.auth-link-button:hover{color:#fff0c9;text-decoration:underline}
    .profile-settings-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:22px}.settings-card{background:linear-gradient(155deg,#1b0b0f,#100708);border:1px solid rgba(233,193,95,.15);border-radius:22px;padding:24px}.settings-card h2,.settings-card h3{margin-top:0;color:#fff4de}.settings-field{display:grid;gap:8px;margin:16px 0}.settings-field label{font-weight:700;color:#ead9ce}.settings-field input{width:100%;box-sizing:border-box;border:1px solid rgba(233,193,95,.18);background:#0c0708;color:#fff8ed;padding:13px 14px;border-radius:12px;font:inherit}.settings-field input:focus{outline:none;border-color:rgba(233,193,95,.55);box-shadow:0 0 0 4px rgba(233,193,95,.07)}.settings-field input[readonly]{opacity:.72}.settings-help{color:#a58f8c;font-size:13px;line-height:1.5}.settings-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.settings-status{min-height:22px;margin-top:12px;color:#85dfac}.settings-status.error{color:#ff9caa}.activity-item{padding:13px 0;border-bottom:1px solid rgba(233,193,95,.1)}.activity-item:last-child{border-bottom:0}.activity-item b{display:block}.activity-item small{color:#9f8987}.email-verify-box{padding:16px;border:1px solid rgba(233,193,95,.22);background:rgba(195,23,44,.09);border-radius:14px;margin-top:16px}
    @media(max-width:850px){.profile-settings-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function enhanceAuthModal(modal){
    if(!modal||modal.dataset.passwordEnhanced)return;
    modal.dataset.passwordEnhanced="1";
    const login=modal.querySelector("#serverLoginForm"),card=modal.querySelector(".server-auth-card"),status=modal.querySelector("#serverAuthStatus");
    if(!login||!card||!status)return;
    const submit=login.querySelector('button[type="submit"]');
    const forgot=document.createElement("button");
    forgot.type="button";forgot.className="auth-link-button";forgot.textContent="Quên mật khẩu?";submit.before(forgot);
    const forgotForm=document.createElement("form");
    forgotForm.id="serverForgotForm";forgotForm.className="server-auth-form";forgotForm.hidden=true;
    forgotForm.innerHTML=`<h2>Khôi phục mật khẩu</h2><p>Nhập email tài khoản để nhận mã xác thực.</p><label>Email<input id="serverForgotEmail" type="email" autocomplete="email" required></label><button class="btn btn-primary" type="submit">Gửi mã xác thực</button><button class="btn btn-secondary" type="button" data-password-back>Quay lại đăng nhập</button>`;
    const resetForm=document.createElement("form");
    resetForm.id="serverResetForm";resetForm.className="server-auth-form";resetForm.hidden=true;
    resetForm.innerHTML=`<h2>Đặt lại mật khẩu</h2><p>Mã xác thực có hiệu lực trong 15 phút.</p><label>Email<input id="serverResetEmail" type="email" readonly></label><label>Mã 6 chữ số<input id="serverResetCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label><label>Mật khẩu mới<input id="serverResetPassword" type="password" minlength="8" autocomplete="new-password" required></label><label>Xác nhận mật khẩu<input id="serverResetConfirm" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn btn-primary" type="submit">Cập nhật mật khẩu</button><button class="btn btn-secondary" type="button" data-password-back>Quay lại đăng nhập</button>`;
    status.before(forgotForm,resetForm);
    const showLogin=()=>{forgotForm.hidden=true;resetForm.hidden=true;const main=modal.querySelector("#serverAuthMain");main.hidden=false;modal.querySelector("#serverLoginForm").hidden=false;modal.querySelector("#serverRegisterForm").hidden=true;modal.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab==="login"));};
    forgot.addEventListener("click",()=>{modal.querySelector("#serverAuthMain").hidden=true;forgotForm.hidden=false;resetForm.hidden=true;forgotForm.querySelector("#serverForgotEmail").value=modal.querySelector("#serverLoginEmail")?.value||"";status.textContent=""});
    modal.addEventListener("click",e=>{if(e.target.closest("[data-password-back]"))showLogin()});
    forgotForm.addEventListener("submit",async e=>{e.preventDefault();const email=forgotForm.querySelector("#serverForgotEmail").value.trim().toLowerCase(),btn=forgotForm.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent="Đang gửi...";try{const r=await api("/api/Accounts/forgot-password",{method:"POST",body:{email},auth:false});forgotForm.hidden=true;resetForm.hidden=false;resetForm.querySelector("#serverResetEmail").value=email;status.textContent=r.message||"Mã xác thực đã được gửi.";status.classList.add("success")}catch(err){status.textContent=err.message;status.classList.remove("success")}finally{btn.disabled=false;btn.textContent="Gửi mã xác thực"}});
    resetForm.addEventListener("submit",async e=>{e.preventDefault();const email=resetForm.querySelector("#serverResetEmail").value,code=resetForm.querySelector("#serverResetCode").value.trim(),password=resetForm.querySelector("#serverResetPassword").value,confirm=resetForm.querySelector("#serverResetConfirm").value;if(!/^\d{6}$/.test(code)){status.textContent="Mã xác thực phải gồm 6 chữ số.";return}if(password.length<8){status.textContent="Mật khẩu phải có ít nhất 8 ký tự.";return}if(password!==confirm){status.textContent="Mật khẩu xác nhận không khớp.";return}const btn=resetForm.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent="Đang cập nhật...";try{const r=await api("/api/Accounts/reset-password",{method:"POST",body:{email,code,newPassword:password},auth:false});showLogin();modal.querySelector("#serverLoginEmail").value=email;status.textContent=r.message||"Mật khẩu đã được cập nhật.";status.classList.add("success")}catch(err){status.textContent=err.message;status.classList.remove("success")}finally{btn.disabled=false;btn.textContent="Cập nhật mật khẩu"}});
  }

  const observer=new MutationObserver(()=>enhanceAuthModal(document.getElementById("serverAuthModal")));
  observer.observe(document.documentElement,{childList:true,subtree:true});

  async function renderProfileSettings(){
    const page=document.body.dataset.page;
    if(page!=="profile"&&page!=="editProfile")return;
    const session=readSession();if(!session?.token)return;
    try{
      const profile=(await api("/api/store/profile")).data;
      document.querySelectorAll(".account-btn span:last-child").forEach(el=>el.textContent=profile.effectiveDisplayName);
      if(page==="profile"){
        const card=document.querySelector(".profile-card");
        if(card){const h2=card.querySelector("h2"),p=card.querySelector("p");if(h2)h2.textContent=profile.effectiveDisplayName;if(p)p.textContent=profile.email;}
        return;
      }
      const app=document.getElementById("app");if(!app)return;
      const activities=(await api("/api/store/profile/activities")).data||[];
      app.innerHTML=`<div class="section-head"><div><span class="eyebrow">Tài khoản</span><h1>Chỉnh sửa hồ sơ</h1></div><a class="btn btn-secondary" href="./profile.html">Quay lại hồ sơ</a></div><div class="profile-settings-grid"><section class="settings-card"><h2>Thông tin cá nhân</h2><div class="settings-field"><label>Tên tài khoản</label><input value="${esc(profile.name)}" readonly><span class="settings-help">Tên tài khoản gốc.</span></div><form id="displayNameForm"><div class="settings-field"><label>Tên hiển thị</label><input id="displayNameInput" maxlength="100" value="${esc(profile.displayName||"")}" placeholder="${esc(profile.name)}"><span class="settings-help">Để trống sẽ tự động sử dụng tên tài khoản.</span></div><button class="btn btn-primary" type="submit">Lưu tên hiển thị</button></form><div id="profileStatus" class="settings-status"></div><hr style="border:0;border-top:1px solid rgba(233,193,95,.12);margin:26px 0"><h2>Email đăng nhập</h2><div class="settings-field"><label>Email hiện tại</label><input value="${esc(profile.email)}" readonly></div><form id="emailChangeForm"><div class="settings-field"><label>Email mới</label><input id="newEmailInput" type="email" placeholder="emailmoi@example.com" required></div><button class="btn btn-secondary" type="submit">Gửi mã xác thực</button></form><div id="emailVerifyArea" ${profile.pendingEmail?"":"hidden"} class="email-verify-box"><b>Xác thực email mới</b><p id="pendingEmailText">${profile.pendingEmail?`Mã đã được gửi tới ${esc(profile.pendingEmail)}.`:""}</p><form id="confirmEmailForm" class="settings-row"><input id="emailCodeInput" class="field-control" inputmode="numeric" maxlength="6" placeholder="Mã 6 chữ số" required><button class="btn btn-primary" type="submit">Xác nhận email</button></form></div></section><aside class="settings-card"><h3>Hoạt động tài khoản</h3><div id="activityList">${activities.length?activities.map(a=>`<div class="activity-item"><b>${esc(a.description)}</b><small>${new Date(a.createdAt).toLocaleString("vi-VN")}</small></div>`).join(""):`<div class="wallet-empty">Chưa có hoạt động.</div>`}</div></aside></div>`;
      const status=document.getElementById("profileStatus"),setStatus=(m,e=false)=>{status.textContent=m;status.classList.toggle("error",e)};
      document.getElementById("displayNameForm").addEventListener("submit",async e=>{e.preventDefault();try{const r=await api("/api/store/profile/display-name",{method:"PUT",body:{displayName:document.getElementById("displayNameInput").value}});setStatus(r.message);window.LVGSession?.cacheServerAccount?.({displayName:r.data.displayName,effectiveDisplayName:r.data.effectiveDisplayName})}catch(err){setStatus(err.message,true)}});
      document.getElementById("emailChangeForm").addEventListener("submit",async e=>{e.preventDefault();try{const r=await api("/api/store/profile/email-change/request",{method:"POST",body:{newEmail:document.getElementById("newEmailInput").value.trim().toLowerCase()}});document.getElementById("emailVerifyArea").hidden=false;document.getElementById("pendingEmailText").textContent=`Mã đã được gửi tới ${r.data.pendingEmail}.`;setStatus(r.message)}catch(err){setStatus(err.message,true)}});
      document.getElementById("confirmEmailForm").addEventListener("submit",async e=>{e.preventDefault();try{const r=await api("/api/store/profile/email-change/confirm",{method:"POST",body:{code:document.getElementById("emailCodeInput").value.trim()}});window.LVGSession?.cacheServerAccount?.({email:r.data.email});setStatus(r.message);setTimeout(()=>location.reload(),500)}catch(err){setStatus(err.message,true)}});
    }catch{}
  }

  const boot=()=>{setTimeout(renderProfileSettings,60);enhanceAuthModal(document.getElementById("serverAuthModal"))};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
