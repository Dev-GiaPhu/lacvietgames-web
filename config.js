window.APP_CONFIG = {
  API_BASE_URL: "https://lacvietgames-api-production.up.railway.app"
};

const serverWalletGuardStyle = document.createElement("style");
serverWalletGuardStyle.textContent = `
  .header-actions > .coin-pill { display: none !important; }
  body.server-authenticated .header-actions > .coin-pill { display: flex !important; }

  /* Auth modal: chỉ hiển thị đúng một bước/form tại một thời điểm. */
  .server-auth-form[hidden],
  #serverAuthMain[hidden],
  #serverVerifyForm[hidden] {
    display: none !important;
  }

  /* Không để form đăng ký dài tràn khỏi màn hình. */
  .server-auth-modal {
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }

  .server-auth-card {
    max-height: calc(100dvh - 40px) !important;
    overflow-y: auto !important;
    scrollbar-gutter: stable;
  }

  @media (max-height: 760px) {
    .server-auth-modal {
      place-items: start center !important;
      padding-top: 12px !important;
      padding-bottom: 12px !important;
    }

    .server-auth-card {
      max-height: calc(100dvh - 24px) !important;
    }
  }
`;
document.head.appendChild(serverWalletGuardStyle);

const registrationFlowScript = document.createElement("script");
registrationFlowScript.src = "./registration-flow.js?v=20260807-1850";
registrationFlowScript.defer = true;
document.head.appendChild(registrationFlowScript);

const storeSessionScript = document.createElement("script");
storeSessionScript.src = "./store-session.js?v=20260807-1850";
storeSessionScript.defer = true;
document.head.appendChild(storeSessionScript);

const footerLinksScript = document.createElement("script");
footerLinksScript.src = "./footer-links.js?v=20260807-1850";
footerLinksScript.defer = true;
document.head.appendChild(footerLinksScript);

const protectedPagesScript = document.createElement("script");
protectedPagesScript.src = "./protected-pages.js?v=20260807-1850";
protectedPagesScript.defer = true;
document.head.appendChild(protectedPagesScript);
