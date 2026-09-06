import { UiIcon } from './UiIcon';
import './KeybindingDisplay.css';

export function KeybindingDisplay({ binding }: { binding: string }) {
	const key = binding.split('+').at(-1);
	if (key !== 'ArrowLeft' && key !== 'ArrowRight') {
		return binding;
	}
	const modifiers = binding.slice(0, -key.length).replaceAll('+', ' + ');
	return (
		<span className="keybinding-value">
			{modifiers}
			<UiIcon name={key === 'ArrowLeft' ? 'arrowLeft' : 'arrowRight'} />
		</span>
	);
}
