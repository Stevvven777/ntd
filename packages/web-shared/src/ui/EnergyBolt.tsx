import { UiIcon } from './UiIcon';
import './EnergyBolt.css';

export function EnergyBolt() {
	return (
		<span className="energy-bolt" aria-hidden="true">
			<UiIcon name="energy" />
		</span>
	);
}
