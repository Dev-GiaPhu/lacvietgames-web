window.APP_CONFIG = {
  API_BASE_URL: "https://lacvietgames-api-production.up.railway.app"
};

// Không bao giờ hiển thị số coin demo trước khi server xác nhận phiên đăng nhập.
const serverWalletGuardStyle = document.createElement("style");
serverWalletGuardStyle.textContent = `
  .header-actions > .coin-pill { display: none !important; }
  body.server-authenticated .header-actions > .coin-pill { display: flex !important; }
`;
document.head.appendChild(serverWalletGuardStyle);

const registrationFlowScript = document.createElement("script");
registrationFlowScript.src = "./registration-flow.js";
registrationFlowScript.defer = true;
document.head.appendChild(registrationFlowScript);

const storeSessionScript = document.createElement("script");
storeSessionScript.src = "./store-session.js";
storeSessionScript.defer = true;
document.head.appendChild(storeSessionScript);
