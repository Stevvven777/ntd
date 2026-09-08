import { describe, expect, it, vi } from 'vitest';
import { literalSearchStrategy } from '@prism-bastion/web-shared/search/literal-search-strategy';
import { pinyinSearchStrategy } from '@prism-bastion/web-shared/search/pinyin-search-strategy';
import { createSearchEngine, type SearchStrategy } from '@prism-bastion/web-shared/search/search-engine';

const search = createSearchEngine([literalSearchStrategy, pinyinSearchStrategy]);

describe('search strategies', () => {
	it('matches literal text in every language', () => {
		const document = { fields: ['Example round', 'A sample description'] };
		expect(search.matches(document, 'EXAMPLE', 'en')).toBe(true);
		expect(search.matches(document, 'sample description', 'zh-CN')).toBe(true);
		expect(search.matches(document, 'trail', 'en')).toBe(false);
	});

	it('adds full and abbreviated pinyin matching for Chinese', () => {
		const document = { fields: [String.fromCodePoint(0x6d4b, 0x8bd5), String.fromCodePoint(0x793a, 0x4f8b)] };
		expect(search.matches(document, 'ceshi', 'zh-CN')).toBe(true);
		expect(search.matches(document, 'cs', 'zh-CN')).toBe(true);
		expect(search.matches(document, 'shili', 'zh-CN')).toBe(true);
		expect(search.matches(document, 'ceshi', 'en')).toBe(false);
	});

	it('selects added strategies through their declared language tags', () => {
		const matches = vi.fn(() => true);
		const extension: SearchStrategy = { languageTags: ['fr'], matches };
		const extendedSearch = createSearchEngine([literalSearchStrategy, extension]);
		const document = { fields: ['unrelated'] };

		expect(extendedSearch.matches(document, 'requete', 'en')).toBe(false);
		expect(matches).not.toHaveBeenCalled();
		expect(extendedSearch.matches(document, 'requete', 'fr-FR')).toBe(true);
		expect(matches).toHaveBeenCalledOnce();
	});
});
