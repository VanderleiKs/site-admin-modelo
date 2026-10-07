import { InjectionToken } from '@angular/core';

/** Origem pública do site, usada em URLs canônicas, Open Graph e JSON-LD. */
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: () => (typeof location === 'undefined' ? '' : location.origin),
});
