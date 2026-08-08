mergeInto(LibraryManager.library, {
  LVG_InitBridge: function () {
    try {
      if (!window.__lvgMessageQueue) window.__lvgMessageQueue = [];
      if (!window.__lvgBridgeListenerInstalled) {
        window.__lvgBridgeListenerInstalled = true;
        window.addEventListener('message', function (event) {
          try {
            if (event.source !== window.parent) return;
            if (event.origin !== 'https://dev-giaphu.github.io') return;
            var data = event.data || {};
            if (typeof data.type !== 'string' || data.type.indexOf('LVG_') !== 0) return;
            window.__lvgMessageQueue.push(JSON.stringify(data));
          } catch (e) {}
        });
      }
      window.parent.postMessage({ type: 'LVG_SDK_READY' }, 'https://dev-giaphu.github.io');
    } catch (e) {}
  },

  LVG_PollMessage: function () {
    try {
      var queue = window.__lvgMessageQueue;
      if (!queue || queue.length === 0) return 0;
      var text = queue.shift();
      var size = lengthBytesUTF8(text) + 1;
      var ptr = _malloc(size);
      stringToUTF8(text, ptr, size);
      return ptr;
    } catch (e) {
      return 0;
    }
  },

  LVG_FreeMessage: function (ptr) {
    try { if (ptr) _free(ptr); } catch (e) {}
  },

  LVG_RequestAuth: function (requestIdPtr) {
    try {
      window.parent.postMessage({
        type: 'LVG_AUTH_REQUEST',
        requestId: UTF8ToString(requestIdPtr)
      }, 'https://dev-giaphu.github.io');
    } catch (e) {}
  },

  LVG_RequestWallet: function (requestIdPtr) {
    try {
      window.parent.postMessage({
        type: 'LVG_WALLET_REQUEST',
        requestId: UTF8ToString(requestIdPtr)
      }, 'https://dev-giaphu.github.io');
    } catch (e) {}
  },

  LVG_ClaimReward: function (eventKeyPtr, requestIdPtr) {
    try {
      window.parent.postMessage({
        type: 'LVG_REWARD_CLAIM',
        eventKey: UTF8ToString(eventKeyPtr),
        requestId: UTF8ToString(requestIdPtr)
      }, 'https://dev-giaphu.github.io');
    } catch (e) {}
  },

  LVG_GameplayStart: function () {
    try {
      window.parent.postMessage({ type: 'LVG_GAMEPLAY_START' }, 'https://dev-giaphu.github.io');
    } catch (e) {}
  },

  LVG_GameplayEnd: function () {
    try {
      window.parent.postMessage({ type: 'LVG_GAMEPLAY_END' }, 'https://dev-giaphu.github.io');
    } catch (e) {}
  },

  LVG_ReturnToStore: function () {
    try {
      window.parent.postMessage({ type: 'LVG_RETURN_TO_STORE' }, 'https://dev-giaphu.github.io');
    } catch (e) {}
  }
});