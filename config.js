window.APP_CONFIG = {
  API_BASE_URL: "https://lacvietgames-api-production.up.railway.app"
};

const serverWalletGuardStyle = document.createElement("style");
serverWalletGuardStyle.textContent = `
  .header-actions > .coin-pill { display: none !important; }
  body.server-authenticated .header-actions > .coin-pill { display: flex !important; }
  .server-auth-form[hidden], #serverAuthMain[hidden], #serverVerifyForm[hidden] { display: none !important; }
  .server-auth-modal { overflow-y: auto !important; overscroll-behavior: contain; }
  .server-auth-card { max-height: calc(100dvh - 40px) !important; overflow-y: auto !important; scrollbar-gutter: stable; }
  @media (max-height: 760px) {
    .server-auth-modal { place-items: start center !important; padding-top: 12px !important; padding-bottom: 12px !important; }
    .server-auth-card { max-height: calc(100dvh - 24px) !important; }
  }
`;
document.head.appendChild(serverWalletGuardStyle);

const version = "20260807-2110";

function loadScript(path) {
  const script = document.createElement("script");
  script.src = `${path}?v=${version}`;
  script.defer = true;
  document.head.appendChild(script);
}

loadScript("./registration-flow.js");
loadScript("./store-session.js");
loadScript("./account-enhancements.js");
loadScript("./display-name-global.js");
loadScript("./footer-links.js");
loadScript("./protected-pages.js");
