window.NavigationSystem = (() => {
  const screens = {};
  let currentScreen = null;

  const state = {
    language: 'en',
    gameMode: null,
    score: 0,
    level: 1
  };

  function registerScreen(screenName, screenModule) {
    screens[screenName] = screenModule;
    console.log(`✅ تم تسجيل الشاشة: ${screenName}`);
  }

  function goTo(screenName) {
    if (!screens[screenName]) {
      console.error(`❌ الشاشة غير موجودة: ${screenName}`);
      return;
    }

    if (currentScreen) {
      const prevScreenElement = document.querySelector('.screen.active');
      if (prevScreenElement) {
        prevScreenElement.classList.remove('active');
      }
    }

    currentScreen = screenName;
    const screenModule = screens[screenName];
    const container = document.getElementById('app-container');
    
    container.innerHTML = screenModule.render(nav);

    setTimeout(() => {
      screenModule.init(nav);
    }, 0);

    console.log(`🎬 انتقلت إلى الشاشة: ${screenName}`);
  }

  const nav = {
    goTo,
    registerScreen,
    state,
    getCurrentScreen: () => currentScreen
  };

  return nav;
})();

const nav = window.NavigationSystem;

// ═══════════════════════════════════════════════════════