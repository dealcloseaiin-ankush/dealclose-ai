// 🚀 Robust Device Detection Utility for DealClose AI
// Prevents accidental mobile redirects on Desktop when DevTools/Console is opened.

export const isRealMobileDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // 1. Check if user explicitly chose a view preference
  try {
    const explicitPref = localStorage.getItem('dealclose_preferred_view');
    if (explicitPref === 'mobile') return true;
    if (explicitPref === 'desktop') return false;
  } catch (e) {
    // Ignore storage errors
  }

  // 2. Check User Agent for true mobile OS
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // 3. Must be a mobile OS AND have a mobile viewport
  return isMobileUA && window.innerWidth < 1024;
};

export const getDeviceType = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Windows/i.test(ua)) return 'desktop_windows';
  if (/Mac/i.test(ua)) return 'desktop_mac';
  return 'desktop';
};

export const isStandalonePWA = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
};
