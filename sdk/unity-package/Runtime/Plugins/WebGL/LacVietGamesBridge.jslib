mergeInto(LibraryManager.library, {
  LVG_InitBridge: function (integrationIdPtr) {
    try {
      var integrationId = integrationIdPtr ? UTF8ToString(integrationIdPtr).trim() : '';
      window.__lvgIntegrationId = integrationId;
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
      window.parent.postMessage({ type: 'LVG_SDK_READY', integrationId: integrationId }, 'https://dev-giaphu.github.io');
    } catch (e) {}
  },
  LVG_PollMessage: function () { try { var queue=window.__lvgMessageQueue;if(!queue||queue.length===0)return 0;var text=queue.shift();var size=lengthBytesUTF8(text)+1;var ptr=_malloc(size);stringToUTF8(text,ptr,size);return ptr;} catch(e){return 0;} },
  LVG_FreeMessage: function(ptr){try{if(ptr)_free(ptr);}catch(e){}},
  LVG_RequestAuth: function(p){try{window.parent.postMessage({type:'LVG_AUTH_REQUEST',requestId:UTF8ToString(p),integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_RequestWallet: function(p){try{window.parent.postMessage({type:'LVG_WALLET_REQUEST',requestId:UTF8ToString(p),integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_RequestIdentity: function(p){try{window.parent.postMessage({type:'LVG_IDENTITY_REQUEST',requestId:UTF8ToString(p),integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_ClaimReward: function(e,r){try{window.parent.postMessage({type:'LVG_REWARD_CLAIM',eventKey:UTF8ToString(e),requestId:UTF8ToString(r),integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(x){}},
  LVG_RequestPlaytimeSummary: function(r){try{window.parent.postMessage({type:'LVG_PLAYTIME_SUMMARY_REQUEST',requestId:UTF8ToString(r),integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_RequestPlaytimeSessions: function(limit,r){try{window.parent.postMessage({type:'LVG_PLAYTIME_SESSIONS_REQUEST',requestId:UTF8ToString(r),limit:limit,integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_RequestTransactions: function(limit,beforeIdPtr,r){try{window.parent.postMessage({type:'LVG_TRANSACTIONS_REQUEST',requestId:UTF8ToString(r),limit:limit,beforeId:beforeIdPtr?UTF8ToString(beforeIdPtr):'',integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_RequestEntitlement: function(r){try{window.parent.postMessage({type:'LVG_ENTITLEMENT_REQUEST',requestId:UTF8ToString(r),integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_RequestStats: function(r){try{window.parent.postMessage({type:'LVG_STATS_REQUEST',requestId:UTF8ToString(r),integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_SubmitStat: function(keyPtr,valuePtr,r){try{window.parent.postMessage({type:'LVG_STAT_SUBMIT',requestId:UTF8ToString(r),key:UTF8ToString(keyPtr),value:valuePtr?UTF8ToString(valuePtr):'0',integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_RequestLeaderboard: function(keyPtr,limit,around,r){try{window.parent.postMessage({type:'LVG_LEADERBOARD_REQUEST',requestId:UTF8ToString(r),key:UTF8ToString(keyPtr),limit:limit,around:around,integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_SubmitLeaderboard: function(keyPtr,valuePtr,r){try{window.parent.postMessage({type:'LVG_LEADERBOARD_SUBMIT',requestId:UTF8ToString(r),key:UTF8ToString(keyPtr),value:valuePtr?UTF8ToString(valuePtr):'0',integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_GameplayStart: function(){try{window.parent.postMessage({type:'LVG_GAMEPLAY_START',integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_GameplayEnd: function(){try{window.parent.postMessage({type:'LVG_GAMEPLAY_END',integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}},
  LVG_ReturnToStore: function(){try{window.parent.postMessage({type:'LVG_RETURN_TO_STORE',integrationId:window.__lvgIntegrationId||''},'https://dev-giaphu.github.io');}catch(e){}}
});
