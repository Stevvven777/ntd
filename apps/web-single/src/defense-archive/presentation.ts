export const formatDuration = (seconds: number): string => {
	const rounded = Math.max(0, Math.round(seconds));
	const hours = Math.floor(rounded / 3600);
	const minutes = Math.floor((rounded % 3600) / 60);
	const remainder = rounded % 60;
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
		: `${minutes}:${String(remainder).padStart(2, '0')}`;
};
