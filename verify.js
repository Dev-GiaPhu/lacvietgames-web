(() => {
  const apiBaseUrl = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const pendingKey = "lacvietgamesPendingRegistration";
  const successKey = "lacvietgamesRegistrationSuccess";
  const emailLabel = document.getElementById("verificationEmail");
  const form = document.getElementById("verificationForm");
  const codeInput = document.getElementById("verificationCode");
  const codeError = document.getElementById("codeError");
  const statusBox = document.getElementById("verificationStatus");
  const verifyButton = document.getElementById("verifyButton");
  const resendButton = document.getElementById("resendButton");
  const changeEmailLink = document.getElementById("changeEmailLink");
  function readPending(){try{return JSON.parse(sessionStorage.getItem(pendingKey)||"null")}catch{return null}}
  function writePending(value){sessionStorage.setItem(pendingKey,JSON.stringify(value))}
  function showStatus(message,type="info"){statusBox.textContent=message;statusBox.className=`flow-status show ${type}`}
  function clearStatus(){statusBox.textContent="";statusBox.className="flow-status"}
  function setBusy(button,busy,text,busyText){button.disabled=busy;button.textContent=busy?busyText:text}
  async function request(path,body){if(!apiBaseUrl)throw new Error("Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.");const response=await fetch(`${apiBaseUrl}${path}`,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body)});const payload=await response.json().catch(()=>null);if(!response.ok||payload?.success===false){const error=new Error(payload?.message||"Không thể xử lý yêu cầu.");error.code=payload?.code;throw error}return payload}
  let pending=readPending();
  if(!pending?.registrationToken||!pending?.email){emailLabel.textContent="Không có phiên đăng ký";codeInput.disabled=true;verifyButton.disabled=true;resendButton.disabled=true;showStatus("Phiên đăng ký không còn hiệu lực. Vui lòng quay lại đăng ký.","error")}else{emailLabel.textContent=pending.email;codeInput.focus()}
  codeInput.addEventListener("input",()=>{codeInput.value=codeInput.value.replace(/\D/g,"").slice(0,6);codeInput.classList.remove("invalid");codeError.textContent="";clearStatus()});
  form.addEventListener("submit",async event=>{event.preventDefault();clearStatus();codeError.textContent="";codeInput.classList.remove("invalid");pending=readPending();if(!pending?.registrationToken){showStatus("Phiên đăng ký không còn hiệu lực. Vui lòng quay lại đăng ký.","error");return}const code=codeInput.value.trim();if(!/^\d{6}$/.test(code)){codeInput.classList.add("invalid");codeError.textContent="Mã xác thực phải gồm đúng 6 chữ số.";return}setBusy(verifyButton,true,"Xác nhận","Đang xác nhận...");try{const result=await request("/api/Accounts/verify-email",{registrationToken:pending.registrationToken,code});const account=result.data||{};sessionStorage.setItem(successKey,JSON.stringify({name:account.accName||pending.name,email:account.accEmail||pending.email,completedAt:Date.now()}));sessionStorage.removeItem(pendingKey);window.location.replace("./success.html")}catch(error){const mustRestart=["INVALID_REGISTRATION_TOKEN","REGISTRATION_TOKEN_REQUIRED","EMAIL_EXISTS"].includes(error.code);showStatus(error.message,"error");if(mustRestart){sessionStorage.removeItem(pendingKey);codeInput.disabled=true;verifyButton.disabled=true;resendButton.disabled=true}}finally{if(!verifyButton.disabled||readPending())setBusy(verifyButton,false,"Xác nhận","Đang xác nhận...")}});
  resendButton.addEventListener("click",async()=>{clearStatus();pending=readPending();if(!pending?.registrationToken){showStatus("Phiên đăng ký không còn hiệu lực. Vui lòng quay lại đăng ký.","error");return}setBusy(resendButton,true,"Gửi lại mã","Đang gửi...");try{const result=await request("/api/Accounts/resend-verification",{registrationToken:pending.registrationToken});const newToken=result.data?.registrationToken;if(!newToken)throw new Error("Không thể gửi lại mã lúc này. Vui lòng thử lại.");pending={...pending,registrationToken:newToken,expiresInMinutes:result.data.expiresInMinutes||15,startedAt:Date.now()};writePending(pending);codeInput.value="";codeInput.focus();showStatus(result.message||"Đã gửi lại mã xác thực.","success")}catch(error){showStatus(error.message,"error")}finally{setBusy(resendButton,false,"Gửi lại mã","Đang gửi...")}});
  changeEmailLink.addEventListener("click",()=>sessionStorage.removeItem(pendingKey));
})();
