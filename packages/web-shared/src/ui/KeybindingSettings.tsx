import { UiIcon } from './UiIcon';
import './KeybindingSettings.css';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	bindingFromEvent,
	defaultKeybindings,
	findKeybindingConflict,
	getKeybindings,
	isReservedPageBinding,
	keybindingActions,
	saveKeybindings,
	useKeybindings,
	type KeybindingAction,
} from './keybindings';

export function KeybindingSettings() {
	const { t } = useTranslation();
	const bindings = useKeybindings();
	const [recording, setRecording] = useState<KeybindingAction | null>(null);
	const [message, setMessage] = useState('');
	useEffect(() => {
		if (!recording) {
			return;
		}
		const capture = (event: KeyboardEvent): void => {
			if (event.key === 'Tab') {
				setRecording(null);
				return;
			}
			event.preventDefault();
			event.stopImmediatePropagation();
			if (event.repeat || event.isComposing) {
				return;
			}
			if (event.key === 'Escape') {
				setRecording(null);
				setMessage('');
				return;
			}
			const binding = bindingFromEvent(event);
			if (!binding) {
				setMessage(t('settings.keys.unsupported'));
				return;
			}
			if (isReservedPageBinding(recording, binding)) {
				setMessage(t('settings.keys.pageNavigationReserved'));
				return;
			}
			const current = getKeybindings();
			const conflict = findKeybindingConflict(current, recording, binding);
			if (conflict) {
				setMessage(t('settings.keys.conflict', { action: t(`settings.keys.${conflict}`) }));
				return;
			}
			saveKeybindings({ ...current, [recording]: binding });
			setMessage('');
			setRecording(null);
		};
		window.addEventListener('keydown', capture, true);
		return () => window.removeEventListener('keydown', capture, true);
	}, [recording, t]);
	return (
		<section className="settings-section settings-keybindings-section">
			<div className="settings-section-copy">
				<strong>{t('settings.keys.title')}</strong>
			</div>
			<div className="keybinding-list">
				{keybindingActions.map((action) => (
					<div className="keybinding-row" key={action}>
						<span id={`keybinding-${action}`}>{t(`settings.keys.${action}`)}</span>
						<button
							type="button"
							aria-labelledby={`keybinding-${action}`}
							aria-pressed={recording === action}
							onBlur={() => {
								if (recording === action) {
									setRecording(null);
								}
							}}
							onClick={() => {
								setRecording(action);
								setMessage('');
							}}
						>
							{recording === action
								? t('settings.keys.listening')
								: (bindings[action] ?? t('settings.keys.unbound'))}
						</button>
						<button
							type="button"
							className="keybinding-clear"
							disabled={bindings[action] === null}
							aria-label={t('settings.keys.clear', { action: t(`settings.keys.${action}`) })}
							onClick={() => {
								saveKeybindings({ ...bindings, [action]: null });
								setRecording(null);
								setMessage('');
							}}
						>
							<UiIcon name="close" />
						</button>
					</div>
				))}
				<p className="keybinding-status" role="status">
					{message}
				</p>
				<button
					type="button"
					className="keybinding-reset"
					onClick={() => {
						saveKeybindings({ ...defaultKeybindings });
						setRecording(null);
						setMessage('');
					}}
				>
					{t('settings.keys.reset')}
				</button>
			</div>
		</section>
	);
}
