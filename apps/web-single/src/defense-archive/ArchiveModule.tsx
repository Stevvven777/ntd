import { createModuleRegistry } from '@prism-bastion/game-core/modules';
import type { ModuleId } from '@prism-bastion/game-core/game/types';
import { moduleName } from '@prism-bastion/web-shared/i18n/presentation';
import { modulePresentationRegistry } from '@prism-bastion/web-shared/module-presentations';
import { moduleVariableStyle } from '@prism-bastion/web-shared/ui/modulePresentation';
import { useTranslation } from 'react-i18next';
import styles from '../DefenseArchive.module.css';

const archiveModules = createModuleRegistry();

export function ArchiveModule({ moduleId, count }: { moduleId: ModuleId; count?: number }) {
	const { t } = useTranslation();
	const definition = archiveModules.get(moduleId);
	const Icon = definition ? modulePresentationRegistry.require(definition.id).icon : undefined;
	return (
		<span className={styles['archive-module']} style={definition ? moduleVariableStyle(definition) : undefined}>
			<i aria-hidden="true">{Icon ? <Icon /> : '?'}</i>
			<em>{moduleName(t, moduleId)}</em>
			{count === undefined ? null : <b>×{count}</b>}
		</span>
	);
}
