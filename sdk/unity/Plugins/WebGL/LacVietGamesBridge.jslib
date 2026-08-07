mergeInto(LibraryManager.library, {
  LVG_GameplayStart: function () {
    try {
      window.parent.postMessage({ type: 'LVG_GAMEPLAY_START' }, '*');
    } catch (e) {}
  },

  LVG_GameplayEnd: function () {
    try {
      window.parent.postMessage({ type: 'LVG_GAMEPLAY_END' }, '*');
    } catch (e) {}
  },

  LVG_ReturnToStore: function () {
    try {
      window.parent.postMessage({ type: 'LVG_RETURN_TO_STORE' }, '*');
    } catch (e) {}
  }
});