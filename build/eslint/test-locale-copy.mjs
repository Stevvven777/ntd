const normalize = (value) => value.replace(/\s+/gu, ' ').trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const methodName = (node) =>
	node?.type === 'MemberExpression' ? (node.computed ? node.property.value : node.property.name) : node?.name;

/** Resources are injected so rule tests own their copy and never freeze production translations. */
export function createTestLocaleCopyRule(resources) {
	const entries = Object.entries(resources).flatMap(([locale, resource]) =>
		Object.entries(resource)
			.filter(
				([, value]) =>
					typeof value === 'string' &&
					(value.replace(/\{\{[^}]*\}\}/gu, '').match(/\p{L}/gu)?.length ?? 0) >= 2,
			)
			.map(([key, value]) => {
				const text = normalize(value);
				return {
					key: `${locale}:${key}`,
					text,
					pattern: new RegExp(
						`^${text
							.split(/\{\{[^}]*\}\}/u)
							.map(escapeRegex)
							.join('.+?')}$`,
						'u',
					),
				};
			}),
	);

	function findCopy(value, partial = false) {
		const text = normalize(value);
		if (text.length < 2 || !/\p{L}/u.test(text)) {
			return undefined;
		}
		return entries.find(
			(entry) => entry.pattern.test(text) || (partial && text.length >= 8 && entry.text.includes(text)),
		);
	}

	return {
		meta: {
			type: 'problem',
			docs: { description: 'Read localized test expectations from locale resources.' },
			schema: [],
			messages: {
				copy: 'Hardcoded test copy matches {{key}}. Read the component’s locale key and use translation interpolation or textPattern; for test-owned fixtures, disable this rule on the assertion with a reason.',
			},
		},
		create(context) {
			const reported = new Set();
			function resolve(node, seen = new Set()) {
				if (!node || seen.has(node)) {
					return node;
				}
				seen.add(node);
				if (
					['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'ChainExpression'].includes(
						node.type,
					)
				) {
					return resolve(node.expression, seen);
				}
				if (node.type === 'Identifier') {
					let scope = context.sourceCode.getScope(node);
					while (scope) {
						const variable = scope.set.get(node.name);
						if (variable) {
							const definition = variable.defs[0];
							return definition?.parent?.kind === 'const' ? resolve(definition.node.init, seen) : node;
						}
						scope = scope.upper;
					}
				}
				return node;
			}

			function inspect(input, reportNode = input, seen = new Set()) {
				const node = resolve(input);
				if (!node || seen.has(node) || reported.has(reportNode)) {
					return;
				}
				seen.add(node);
				let match;
				if (node.type === 'Literal' && typeof node.value === 'string') {
					match = findCopy(node.value);
				} else if (node.type === 'Literal' && node.regex) {
					// Do not execute arbitrary test regexes against the catalog.
					const decoded = node.regex.pattern
						.replace(/\\u\{([\da-f]+)\}|\\u([\da-f]{4})/giu, (original, wide, narrow) => {
							const point = Number.parseInt(wide ?? narrow, 16);
							return point <= 0x10ffff ? String.fromCodePoint(point) : original;
						})
						.replace(/\\([.*+?^${}()|[\]\\/])/gu, '$1');
					match = findCopy(decoded.replace(/^\^|\$$/gu, ''), true);
					match ??= decoded
						.split(/[.*+?^${}()|[\]\\]+/u)
						.map((part) => findCopy(part, true))
						.find(Boolean);
				} else if (node.type === 'TemplateLiteral') {
					match = findCopy(node.quasis.map((part) => part.value.cooked ?? part.value.raw).join('{{}}'));
					match ??= node.quasis
						.map((part) => findCopy(part.value.cooked ?? part.value.raw, true))
						.find(Boolean);
					for (const expression of node.expressions) {
						inspect(expression, reportNode, seen);
					}
				} else if (node.type === 'BinaryExpression' && node.operator === '+') {
					inspect(node.left, reportNode, seen);
					inspect(node.right, reportNode, seen);
				} else if (node.type === 'ArrayExpression') {
					for (const element of node.elements) {
						inspect(element, reportNode, seen);
					}
				} else if (node.type === 'NewExpression' && node.callee.name === 'RegExp') {
					inspect(node.arguments[0], reportNode, seen);
				}
				if (match && !reported.has(reportNode)) {
					reported.add(reportNode);
					context.report({ node: reportNode, messageId: 'copy', data: { key: match.key } });
				}
			}

			function readsDomText(input, seen = new Set()) {
				const node = resolve(input);
				if (!node || seen.has(node)) {
					return false;
				}
				seen.add(node);
				if (node.type === 'MemberExpression') {
					return ['textContent', 'innerText'].includes(methodName(node)) || readsDomText(node.object, seen);
				}
				if (node.type === 'CallExpression') {
					if (methodName(node.callee) === 'getAttribute') {
						return ['aria-label', 'title', 'placeholder', 'alt'].includes(
							resolve(node.arguments[0])?.value,
						);
					}
					return readsDomText(node.callee, seen);
				}
				if (node.type === 'AwaitExpression') {
					return readsDomText(node.argument, seen);
				}
				return false;
			}

			function assertsDomText(node) {
				let receiver = node.callee.object;
				while (receiver?.type === 'MemberExpression') {
					receiver = receiver.object;
				}
				return (
					receiver?.type === 'CallExpression' &&
					(methodName(receiver.callee) === 'expect' ||
						(receiver.callee.object?.name === 'expect' && methodName(receiver.callee) === 'soft')) &&
					readsDomText(receiver.arguments[0])
				);
			}

			return {
				CallExpression(node) {
					const name = methodName(node.callee);
					if (/^(get|find|query)(All)?ByRole$/u.test(name)) {
						const options = resolve(node.arguments[1]);
						if (options?.type === 'ObjectExpression') {
							for (const property of options.properties) {
								if ((property.key?.name ?? property.key?.value) === 'name') {
									inspect(property.value);
								}
							}
						}
					} else if (
						/^(get|find|query)(All)?By(Text|Label|LabelText|Placeholder|PlaceholderText|Title|AltText|DisplayValue)$/u.test(
							name,
						) ||
						/^to(HaveText|ContainText|HaveAccessibleName|HaveAccessibleDescription)$/u.test(name) ||
						(/^to(Be|Equal|Contain|Match)$/u.test(name) && assertsDomText(node))
					) {
						inspect(node.arguments[0]);
					}
				},
			};
		},
	};
}
