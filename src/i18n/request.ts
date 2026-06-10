// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';   // On va l'utiliser pour le fallback

export default getRequestConfig(async ({ requestLocale }) => {
  // Détermine la locale avec fallback
  let locale = await requestLocale;
  
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale: locale as string,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});