import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type appI18n from '../../packages/web-shared/src/i18n';
import en from '../../packages/web-shared/src/i18n/locales/en.json' with { type: 'json' };

// Resolve the application's i18next dependency without importing browser initialization in Playwright.
const require = createRequire(resolve('packages/web-shared/package.json'));
const i18n = (require('i18next') as typeof appI18n).createInstance();
void i18n.init({
	resources: { en: { translation: en } },
	lng: 'en',
	fallbackLng: 'en',
	keySeparator: false,
	interpolation: { escapeValue: false },
});

/** Use production interpolation with a fixed language, independent of language-switching tests. */
export function translate(key: keyof typeof en, values: Record<string, string | number>): string {
	return i18n.getFixedT('en')(key, values);
}
