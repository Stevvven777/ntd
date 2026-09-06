import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
	general: (
		<>
			<path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11" />
			<path d="M8 3h4v6H8zM14 9h4v6h-4zM6 15h4v6H6z" />
		</>
	),
	controls: <path d="M2 5h20v14H2zM5 9h1m3 0h1m3 0h1m3 0h2M5 12h1m3 0h1m3 0h1m3 0h2M7 16h10" />,
	storage: <path d="M3 3h18v5H3zM5 8v13h14V8M9 12h6" />,
	info: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v1M10 11h2v6m-2 0h4" />
		</>
	),
};

export function SettingsCategoryIcon({ category }: { category: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="square"
			strokeLinejoin="miter"
			aria-hidden="true"
		>
			{paths[category]}
		</svg>
	);
}
