'use client';
import L from 'leaflet';

if (typeof window !== 'undefined' && !(L.DomUtil as any)._isReact18Patched) {
  const originalRemoveClass = L.DomUtil.removeClass;
  (L.DomUtil as any).removeClass = function (el: HTMLElement | undefined, name: string) {
    if (!el) return;
    return originalRemoveClass.call(this, el, name);
  };
  
  const originalAddClass = L.DomUtil.addClass;
  (L.DomUtil as any).addClass = function (el: HTMLElement | undefined, name: string) {
    if (!el) return;
    return originalAddClass.call(this, el, name);
  };

  const originalHasClass = L.DomUtil.hasClass;
  (L.DomUtil as any).hasClass = function (el: HTMLElement | undefined, name: string) {
    if (!el) return false;
    return originalHasClass.call(this, el, name);
  };

  (L.DomUtil as any)._isReact18Patched = true;
}
