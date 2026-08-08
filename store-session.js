(() => {
  if (document.body.classList.contains("auth-page")) return;

  const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const STORE_KEY = "lacvietgamesStoreSession";
  const COOKIE_SENTINEL = window.LVGSession?.cookieSentinel || "cookie.session";
  let pendingAction = null;
  let pendingRegistration = null;

  const read = () => window.LVGSession?.read?.() || (() => {
    try { const raw = sessionStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  })();

  function saveSession(result) {
    const account = result?.data?.account;
    if (!account || !result?.data?.token) throw new Error("Phiên đăng nhập không hợp lệ.");
    const session = {
      id: account.id,
      name: account.name,
      displayName: account.displayName || null,
      effectiveDisplayName: account.effectiveDisplayName || account.displayName || account.name,
      email: account.email,
      role: account.role,
      coinBalance: Number(account.coinBalance || 0),
      verified: !!account.isEmailVerified,
      token: result.data.token,
      sessionMode: result.data.sessionMode || (result.data.token === COOKIE_SENTINEL ? "secure-cookie" : "session-token"),
      loginAt: new Date().toISOString()
    };
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem("lacvietgamesSession");
      sessionStorage.setItem(STORE_KEY, JSON.stringify(session));
      sessionStorage.setItem("lacvietgamesSession", JSON.stringify({ id:session.id,name:session.name,email:session.email,role:session.role,verified:session.verified }));
    } catch {}
    window.dispatchEvent(new CustomEvent("lvg:login-success", { detail:session }));
    return session;
  }

  async function request(path, { method="GET", body, auth=false } = {}) {
    const session = read();
    const headers = { "Content-Type":"application/json", "Accept":"application/json" };
    if (auth && session?.token && session.token !== COOKIE_SENTINEL) headers.Authorization = `Bearer ${session.token}`;
    if (auth && !session?.token) throw Object.assign(new Error("Bạn cần đăng nhập."), { code:"AUTH_REQUIRED" });
    let response;
    try {
      response = await fetch(`${API}${path}`, {
        method,
        credentials:"include",
        cache:"no-store",
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new Error("Không thể kết nối LacVietGames. Vui lòng thử lại.");
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      const error = new Error(payload?.message || "Không thể xử lý yêu cầu.");
      error.code = payload?.code;
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function ensureStyles() {
    if (document.getElementById("lvgAuthStyles")) return;
    const style = document.createElement("style");
    style.id = "lvgAuthStyles";
    style.textContent = `
      .server-auth-modal{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:22px;background:rgba(5,2,3,.78);backdrop-filter:blur(16px);overflow:auto}
      .server-auth-modal[hidden]{display:none!important}.server-auth-card{position:relative;width:min(500px,100%);max-height:calc(100dvh - 44px);overflow:auto;padding:30px;border-radius:26px;background:radial-gradient(circle at 90% 0,rgba(233,193,95,.08),transparent 28%),linear-gradient(155deg,#210d12,#100708 72%);border:1px solid rgba(233,193,95,.22);box-shadow:0 34px 100px rgba(0,0,0,.62);color:#fff8ed}
      .server-auth-close{position:absolute;right:16px;top:14px;width:40px;height:40px;border-radius:12px;border:1px solid rgba(233,193,95,.14);background:#11090b;color:#d8bf9c;font:700 22px/1 inherit;cursor:pointer}.server-auth-close:hover{background:#2a0d13;color:#fff0ca}
      .server-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:34px 0 24px;padding:5px;border-radius:15px;background:#0d0708;border:1px solid rgba(233,193,95,.1)}.server-auth-tabs button{border:0;border-radius:11px;padding:12px;background:transparent;color:#aa9491;font:700 14px/1 inherit;cursor:pointer}.server-auth-tabs button.active{background:linear-gradient(135deg,#d52135,#970d1d);color:#fff5dc;box-shadow:0 10px 26px rgba(195,23,44,.24)}
      .server-auth-form{display:grid;gap:14px}.server-auth-form[hidden],#serverAuthMain[hidden],#serverVerifyForm[hidden]{display:none!important}.server-auth-form h2{margin:0;font-size:27px;letter-spacing:-.8px}.server-auth-form p{margin:0 0 7px;color:#bca7a2;line-height:1.65}.server-auth-form label{display:grid;gap:7px;color:#ead9ce;font-size:13px;font-weight:650}.server-auth-form input{width:100%;box-sizing:border-box;border:1px solid rgba(233,193,95,.18);background:#0c090a;color:#fff8ed;border-radius:13px;padding:13px 14px;font:inherit;outline:none}.server-auth-form input:focus{border-color:rgba(233,193,95,.62);box-shadow:0 0 0 4px rgba(233,193,95,.08)}.server-auth-form .btn{min-height:46px}.server-auth-status{min-height:20px;margin-top:13px;color:#ff9ca9;font-size:13px}.server-auth-status.success{color:#83dfad}
      .auth-link-button{color:#e9c15f!important}.server-toast{position:fixed;right:24px;bottom:24px;z-index:10001;padding:13px 18px;border-radius:14px;background:#1c0b0f;border:1px solid rgba(233,193,95,.2);color:#fff3d5;box-shadow:0 18px 55px rgba(0,0,0,.4);opacity:0;transform:translateY(12px);pointer-events:none;transition:.18s}.server-toast.show{opacity:1;transform:none}.server-toast[data-type="error"]{background:#341018;border-color:#8d2638;color:#ffc3cb}
      .server-notifications{background:#170b0e!important;border-color:rgba(233,193,95,.18)!important}.server-notification.unread{background:#2b0e14!important;border-color:rgba(233,193,95,.15)!important}
      @media(max-width:560px){.server-auth-modal{padding:12px;place-items:start center}.server-auth-card{padding:24px 18px;margin-top:8px;max-height:calc(100dvh - 24px)}}
    `;
    document.head.appendChild(style);
  }

  function setStatus(message="", success=false) {
    const el = document.getElementById("serverAuthStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("success", success);
  }

  function toast(message, type="success") {
    let el = document.getElementById("serverToast");
    if (!el) { el=document.createElement("div"); el.id="serverToast"; el.className="server-toast"; document.body.appendChild(el); }
    el.textContent=message; el.dataset.type=type; el.classList.add("show");
    clearTimeout(window.__lvgToastTimer); window.__lvgToastTimer=setTimeout(()=>el.classList.remove("show"),3000);
  }

  async function hydrate() {
    const payload = await request("/api/store/me", { auth:true });
    const session = read();
    if (session && payload?.data) {
      const d=payload.data;
      Object.assign(session,{id:d.id,name:d.name,displayName:d.displayName||null,effectiveDisplayName:d.effectiveDisplayName||d.displayName||d.name,email:d.email,role:d.role,coinBalance:Number(d.coinBalance||0),unreadNotifications:Number(d.unreadNotifications||0),library:Array.isArray(d.library)?d.library:[]});
      sessionStorage.setItem(STORE_KEY,JSON.stringify(session));
      window.dispatchEvent(new CustomEvent("lvg:session-hydrated",{detail:session}));
    }
    return payload?.data;
  }

  function close() {
    document.getElementById("serverAuthModal")?.remove();
    document.body.style.overflow="";
  }

  function open(action=null, initialTab="login") {
    pendingAction=action;
    document.getElementById("serverAuthModal")?.remove();
    const modal=document.createElement("div");
    modal.id="serverAuthModal"; modal.className="server-auth-modal";
    modal.innerHTML=`<section class="server-auth-card" role="dialog" aria-modal="true" aria-label="Tài khoản LacVietGames"><button class="server-auth-close" type="button" data-close-auth aria-label="Đóng">×</button><div id="serverAuthMain"><div class="server-auth-tabs"><button type="button" data-auth-tab="login">Đăng nhập</button><button type="button" data-auth-tab="register">Đăng ký</button></div><form id="serverLoginForm" class="server-auth-form"><h2>Đăng nhập</h2><p>Tiếp tục với tài khoản LacVietGames.</p><label>Email<input id="serverLoginEmail" type="email" autocomplete="email" required></label><label>Mật khẩu<input id="serverLoginPassword" type="password" autocomplete="current-password" required></label><button class="btn btn-primary" type="submit">Đăng nhập</button></form><form id="serverRegisterForm" class="server-auth-form" hidden><h2>Tạo tài khoản</h2><p>Đăng ký để sử dụng thư viện, Lạc Coin và các tính năng dành cho người chơi.</p><label>Họ và tên<input id="serverRegisterName" type="text" maxlength="120" autocomplete="name" required></label><label>Email<input id="serverRegisterEmail" type="email" autocomplete="email" required></label><label>Mật khẩu<input id="serverRegisterPassword" type="password" minlength="8" autocomplete="new-password" required></label><label>Xác nhận mật khẩu<input id="serverRegisterConfirm" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn btn-primary" type="submit">Tiếp tục</button></form></div><form id="serverVerifyForm" class="server-auth-form" hidden><h2>Xác thực email</h2><p id="serverVerifyLabel"></p><label>Mã xác thực<input id="serverVerifyCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label><button class="btn btn-primary" type="submit">Xác nhận</button><button class="btn btn-secondary" type="button" data-back-register>Quay lại</button></form><div id="serverAuthStatus" class="server-auth-status"></div></section>`;
    document.body.appendChild(modal); document.body.style.overflow="hidden";

    const showTab=tab=>{
      modal.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));
      modal.querySelector("#serverLoginForm").hidden=tab!=="login";
      modal.querySelector("#serverRegisterForm").hidden=tab!=="register";
      modal.querySelector("#serverVerifyForm").hidden=true;
      modal.querySelector("#serverAuthMain").hidden=false;
      setStatus("");
    };
    showTab(initialTab);
    modal.addEventListener("click",e=>{
      if(e.target.closest("[data-close-auth]")){close();return}
      const tab=e.target.closest("[data-auth-tab]")?.dataset.authTab;if(tab)showTab(tab);
      if(e.target.closest("[data-back-register]"))showTab("register");
    });
    modal.querySelector("#serverLoginForm").addEventListener("submit",handleLogin);
    modal.querySelector("#serverRegisterForm").addEventListener("submit",handleRegister);
    modal.querySelector("#serverVerifyForm").addEventListener("submit",handleVerify);
    setTimeout(()=>modal.querySelector(initialTab==="register"?"#serverRegisterName":"#serverLoginEmail")?.focus(),30);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector('button[type="submit"]');
    button.disabled=true;button.textContent="Đang đăng nhập...";setStatus("");
    try {
      const result=await request("/api/store/auth/login",{method:"POST",body:{email:form.querySelector("#serverLoginEmail").value.trim().toLowerCase(),password:form.querySelector("#serverLoginPassword").value}});
      saveSession(result);
      await hydrate();
      close(); toast("Đăng nhập thành công.");
      if(typeof pendingAction==="function")await pendingAction();
      pendingAction=null;
    } catch(error){setStatus(error.message||"Không thể đăng nhập.")}
    finally{button.disabled=false;button.textContent="Đăng nhập"}
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form=event.currentTarget,name=form.querySelector("#serverRegisterName").value.trim(),email=form.querySelector("#serverRegisterEmail").value.trim().toLowerCase(),password=form.querySelector("#serverRegisterPassword").value,confirm=form.querySelector("#serverRegisterConfirm").value;
    if(name.length<2)return setStatus("Họ và tên phải có ít nhất 2 ký tự.");
    if(password.length<8)return setStatus("Mật khẩu phải có ít nhất 8 ký tự.");
    if(password!==confirm)return setStatus("Mật khẩu xác nhận không khớp.");
    const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent="Đang gửi...";setStatus("");
    try{
      const result=await request("/api/Accounts/register",{method:"POST",body:{name,email,password}});
      pendingRegistration=result.data;
      if(!pendingRegistration?.registrationToken)throw new Error("Không thể tạo phiên xác thực.");
      document.getElementById("serverAuthMain").hidden=true;document.getElementById("serverVerifyForm").hidden=false;document.getElementById("serverVerifyLabel").textContent=`Mã xác thực đã được gửi tới ${pendingRegistration.email||email}.`;setStatus("");
    }catch(error){setStatus(error.message||"Không thể đăng ký.")}
    finally{button.disabled=false;button.textContent="Tiếp tục"}
  }

  async function handleVerify(event) {
    event.preventDefault();if(!pendingRegistration?.registrationToken)return setStatus("Phiên xác thực đã hết hạn. Vui lòng đăng ký lại.");
    const form=event.currentTarget,code=form.querySelector("#serverVerifyCode").value.trim();if(!/^\d{6}$/.test(code))return setStatus("Mã xác thực phải gồm 6 chữ số.");
    const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent="Đang xác nhận...";
    try{
      const result=await request("/api/Accounts/verify-email",{method:"POST",body:{registrationToken:pendingRegistration.registrationToken,code}});
      const email=result?.data?.accEmail||pendingRegistration.email||"";pendingRegistration=null;
      document.getElementById("serverVerifyForm").hidden=true;document.getElementById("serverAuthMain").hidden=false;document.getElementById("serverLoginForm").hidden=false;document.getElementById("serverRegisterForm").hidden=true;document.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab==="login"));document.getElementById("serverLoginEmail").value=email;setStatus("Tài khoản đã sẵn sàng. Đăng nhập để tiếp tục.",true);
    }catch(error){setStatus(error.message||"Không thể xác thực.")}
    finally{button.disabled=false;button.textContent="Xác nhận"}
  }

  ensureStyles();
  document.addEventListener("click",e=>{const trigger=e.target.closest("[data-open-server-auth]");if(trigger){e.preventDefault();open(null,trigger.dataset.authTab||"login")}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("serverAuthModal"))close()});
  window.LVGAuth={open,close,hydrate};
})();
