import { UiIcon } from './UiIcon';
import { useKeybindings } from './keybindings';
import type { DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleId } from '@prism-bastion/game-core/game/types';
import type { ModuleDefinition } from '@prism-bastion/game-core/modules';
import { moduleDescription, moduleName, moduleShortName } from '../i18n/presentation';
import { KIND_SYMBOL, moduleVariableStyle } from './modulePresentation';
import { modulePresentationRegistry } from '../module-presentations';
import './ModuleSlot.css';

export function ModuleSlot({
	index,
	isLast,
	definition,
	selectedModule,
	selected,
	onSelect,
	onInstall,
	onSwap,
}: {
	index: number;
	isLast: boolean;
	definition: ModuleDefinition | undefined;
	selectedModule: ModuleId | null;
	selected: boolean;
	onSelect: () => void;
	onInstall: (index: number, moduleId: ModuleId | null) => void;
	onSwap: (source: number, destination: number) => void;
}) {
	const { t } = useTranslation();
	const bindings = useKeybindings();
	const Icon = definition ? modulePresentationRegistry.require(definition.id).icon : undefined;
	const dragStart = (event: DragEvent<HTMLButtonElement>): void => {
		onSelect();
		event.dataTransfer.setData('text/slot', String(index));
		event.dataTransfer.effectAllowed = 'move';
	};
	const drop = (event: DragEvent<HTMLButtonElement>): void => {
		event.preventDefault();
		event.currentTarget.classList.remove('drag-over');
		const incoming = event.dataTransfer.getData('text/module');
		const source = event.dataTransfer.getData('text/slot');
		if (incoming) {
			onInstall(index, incoming);
		} else if (source !== '') {
			onSwap(Number(source), index);
		}
	};
	return (
		<div className="slot-wrap">
			{!definition ? (
				<button
					className="module-slot empty"
					data-slot={index}
					data-tutorial-slot={index}
					onClick={() => {
						if (selectedModule) {
							onInstall(index, selectedModule);
						}
					}}
					onDragOver={(event) => {
						event.preventDefault();
						event.currentTarget.classList.add('drag-over');
					}}
					onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')}
					onDrop={drop}
					aria-label={t('moduleSlot.emptyAria', { slot: index + 1 })}
				>
					<span>+</span>
					<small>{t('moduleSlot.slot', { slot: index + 1 })}</small>
				</button>
			) : (
				<div className="filled-slot">
					<button
						className={`module-slot filled selection-option ${selected ? 'selected' : ''} ${definition.kind}`}
						data-slot={index}
						data-touch-slot={index}
						data-tutorial-slot={index}
						style={moduleVariableStyle(definition)}
						draggable
						onDragStart={dragStart}
						onDragOver={(event) => {
							event.preventDefault();
							event.currentTarget.classList.add('drag-over');
						}}
						onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')}
						onDrop={drop}
						onClick={onSelect}
						onFocus={onSelect}
						aria-pressed={selected}
						aria-keyshortcuts={[bindings.moveLeft, bindings.moveRight].filter(Boolean).join(' ')}
						aria-label={t('moduleSlot.filledAria', {
							slot: index + 1,
							module: moduleName(t, definition.id),
							left: bindings.moveLeft ?? t('settings.keys.unbound'),
							right: bindings.moveRight ?? t('settings.keys.unbound'),
						})}
						title={t('moduleSlot.filledTitle', {
							module: moduleName(t, definition.id),
							description: moduleDescription(t, definition),
							left: bindings.moveLeft ?? t('settings.keys.unbound'),
							right: bindings.moveRight ?? t('settings.keys.unbound'),
						})}
					>
						<span className="slot-kind">{KIND_SYMBOL[definition.kind]}</span>
						<span className="slot-icon">{Icon ? <Icon /> : null}</span>
						<small>{moduleShortName(t, definition.id)}</small>
					</button>
					<button
						className="slot-remove"
						onClick={() => onInstall(index, null)}
						aria-label={t('moduleSlot.remove', { slot: index + 1, module: moduleName(t, definition.id) })}
					>
						<UiIcon name="close" />
					</button>
				</div>
			)}
			{!isLast ? <span className="flow-arrow">›</span> : null}
		</div>
	);
}
