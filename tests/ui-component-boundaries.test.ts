import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const uiDirectories = [
	resolve('packages/web-shared/src/ui'),
	resolve('apps/web-single/src'),
	resolve('apps/web-coop/src'),
];
const componentFiles = uiDirectories.flatMap((directory) =>
	readdirSync(directory)
		.filter((file) => file.endsWith('.tsx') && file !== 'main.tsx' && file !== 'coop-feature.tsx')
		.map((file) => ({ directory, file })),
);
const modernizedComponents = [
	'apps/web-single/src/DefenseArchive.tsx',
	'apps/web-single/src/LevelSelect.tsx',
	'apps/web-single/src/TutorialGuide.tsx',
	'packages/web-shared/src/ui/LevelMap.tsx',
	'packages/web-shared/src/ui/SettingsPanel.tsx',
	'packages/web-shared/src/ui/ThoughtFlowOverlay.tsx',
];
const exportedComponents = (path: string): string[] => {
	const source = ts.createSourceFile(
		path,
		readFileSync(path, 'utf8'),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	return source.statements.flatMap((statement) => {
		const exported =
			statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
		if (!exported) {
			return [];
		}
		if (ts.isFunctionDeclaration(statement) && statement.name && /^[A-Z]/.test(statement.name.text)) {
			return [statement.name.text];
		}
		if (ts.isVariableStatement(statement)) {
			return statement.declarationList.declarations.flatMap((declaration) =>
				ts.isIdentifier(declaration.name) &&
				/^[A-Z]/.test(declaration.name.text) &&
				declaration.initializer &&
				(ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
					? [declaration.name.text]
					: [],
			);
		}
		return [];
	});
};

describe('UI component boundaries', () => {
	it.each(componentFiles)('$file owns a same-named stylesheet', ({ directory, file }) => {
		const componentName = basename(file, '.tsx');
		const source = readFileSync(join(directory, file), 'utf8');
		const globalStylesheet = existsSync(join(directory, `${componentName}.css`));
		const moduleStylesheet = existsSync(join(directory, `${componentName}.module.css`));
		expect(Number(globalStylesheet) + Number(moduleStylesheet)).toBe(1);
		expect(source).toContain(
			moduleStylesheet ? `import styles from './${componentName}.module.css'` : `import './${componentName}.css'`,
		);
	});

	it.each(componentFiles)('$file exports no more than one public component', ({ directory, file }) => {
		expect(exportedComponents(join(directory, file))).toHaveLength(1);
	});

	it.each(modernizedComponents)('%s keeps styles locally scoped', (path) => {
		const source = readFileSync(resolve(path), 'utf8');
		expect(source).toMatch(/import styles from ['"].*\.module\.css['"]/);
		expect(source).not.toMatch(/import ['"].*\.css['"]/);
	});
});
