window.APP_CONFIG = {
  API_BASE_URL: "https://lacvietgames-api-production.up.railway.app"
};

const registrationFlowScript = document.createElement("script");
registrationFlowScript.src = "./registration-flow.js";
registrationFlowScript.defer = true;
document.head.appendChild(registrationFlowScript);
