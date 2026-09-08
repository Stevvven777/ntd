/** Match localized text literally, including punctuation with special regex meaning. */
export function textPattern(text: string, options: { start?: boolean } = {}): RegExp {
	return new RegExp(`${options.start ? '^' : ''}${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}
