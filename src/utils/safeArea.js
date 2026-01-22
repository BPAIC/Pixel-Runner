export function getSafeInsets() {
  if (typeof window === 'undefined' || !window.getComputedStyle) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const style = window.getComputedStyle(document.documentElement);
  const toPx = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    top: toPx(style.getPropertyValue('--safe-top')),
    right: toPx(style.getPropertyValue('--safe-right')),
    bottom: toPx(style.getPropertyValue('--safe-bottom')),
    left: toPx(style.getPropertyValue('--safe-left'))
  };
}
