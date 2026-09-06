import { UiIcon, type UiIconName } from '../UiIcon';
import type { SettingsCategory } from './SettingsContent';

const categoryIcons = {
	general: 'sliders',
	controls: 'keyboard',
	storage: 'archive',
	info: 'info',
} satisfies Record<SettingsCategory, UiIconName>;

export function SettingsCategoryIcon({ category }: { category: SettingsCategory }) {
	return <UiIcon name={categoryIcons[category]} />;
}
