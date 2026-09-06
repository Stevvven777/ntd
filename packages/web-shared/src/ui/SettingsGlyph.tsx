import { UiIcon } from './UiIcon';
import './SettingsGlyph.css';

export function SettingsGlyph() {
	return (
		<span className="settings-glyph" aria-hidden="true">
			<UiIcon name="settings" />
		</span>
	);
}
