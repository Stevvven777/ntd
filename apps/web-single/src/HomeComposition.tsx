import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './HomeComposition.css';

const palette = ['var(--purple)', 'var(--coral)', 'var(--mint)', 'var(--yellow)', '#efedf3'];
const avenues = [42, 116, 174, 298, 342, 466, 588, 644, 766, 848, 964, 1056, 1132];
const streets = [22, 66, 116];
const landmarks = [
	{ x: 214, y: 35, width: 48, height: 30 },
	{ x: 498, y: 80, width: 54, height: 34 },
	{ x: 688, y: 25, width: 46, height: 40 },
	{ x: 886, y: 78, width: 46, height: 38 },
] as const;

// Only the connected streets belong to the outline; accents appear in color.
const fields = [
	...streets.map((y) => ({ x: 0, y, width: 1200, height: 9 })),
	...avenues.map((x) => ({ x, y: 0, width: 9, height: 150 })),
];
const xs = [...new Set(fields.flatMap(({ x, width }) => [x, x + width]))].sort((a, b) => a - b);
const ys = [...new Set(fields.flatMap(({ y, height }) => [y, y + height]))].sort((a, b) => a - b);
const occupied = xs
	.slice(0, -1)
	.map((x, column) =>
		ys
			.slice(0, -1)
			.map((y, row) =>
				fields.some(
					(field) =>
						(x + xs[column + 1]!) / 2 > field.x &&
						(x + xs[column + 1]!) / 2 < field.x + field.width &&
						(y + ys[row + 1]!) / 2 > field.y &&
						(y + ys[row + 1]!) / 2 < field.y + field.height,
				),
			),
	);
const outline = occupied
	.flatMap((column, x) =>
		column.flatMap((filled, y) => {
			if (!filled) {
				return [];
			}
			const left = xs[x]!;
			const right = xs[x + 1]!;
			const top = ys[y]!;
			const bottom = ys[y + 1]!;
			return [
				!occupied[x - 1]?.[y] ? `M${left},${top}V${bottom}` : '',
				!occupied[x + 1]?.[y] ? `M${right},${top}V${bottom}` : '',
				!column[y - 1] ? `M${left},${top}H${right}` : '',
				!column[y + 1] ? `M${left},${bottom}H${right}` : '',
			];
		}),
	)
	.join(' ');

export function HomeComposition() {
	const { t } = useTranslation();
	const [beat, setBeat] = useState(0);
	const color = (index: number): string => palette[(index + beat) % palette.length]!;
	return (
		<button
			type="button"
			className="home-composition"
			aria-label={t('levelSelect.remixComposition')}
			onClick={() => setBeat((current) => (current + 1) % palette.length)}
		>
			{['outline', 'color'].map((layer) => (
				<svg
					key={layer}
					className={`home-composition-grid home-composition-grid--${layer}`}
					viewBox="0 0 1200 150"
					preserveAspectRatio="xMidYMid slice"
					aria-hidden="true"
				>
					{layer === 'outline' ? (
						<path d={outline} />
					) : (
						<g fill="var(--yellow)">
							{streets.map((y) => (
								<rect key={y} x="0" y={y} width="1200" height="9" />
							))}
							{avenues.map((x) => (
								<rect key={x} x={x} y="0" width="9" height="150" />
							))}
						</g>
					)}
					<g className="home-composition-notes">
						{layer === 'color' ? (
							<>
								{streets.flatMap((y, row) =>
									Array.from({ length: 36 }, (_, index) => (
										<rect
											key={`${row}-${index}`}
											x={index * 34 + ((row * 17) % 29)}
											y={y}
											width={index % 7 === 0 ? 18 : 9}
											height="9"
											fill={color(index * 3 + row)}
										/>
									)),
								)}
								{avenues.flatMap((x, column) =>
									[0, 37, 87, 134].map((y, index) => (
										<rect
											key={`${column}-${index}`}
											x={x}
											y={y + (column % 3) * 3}
											width="9"
											height={index % 2 ? 9 : 15}
											fill={color(column + index * 2)}
										/>
									)),
								)}
								<rect x="62" y="77" width="36" height="39" fill={color(0)} />
								<rect x="70" y="87" width="20" height="20" fill={color(2)} />
								<rect x="370" y="31" width="64" height="24" fill={color(1)} />
								<rect x="386" y="31" width="16" height="12" fill={color(4)} />
								<rect x="1000" y="84" width="32" height="32" fill={color(2)} />
								<rect x="1008" y="92" width="16" height="16" fill={color(3)} />
								{landmarks.map((landmark, index) => (
									<g className="home-composition-landmark" key={landmark.x}>
										<rect
											x={landmark.x}
											y={landmark.y}
											width={landmark.width}
											height={landmark.height}
											fill={color(index)}
										/>
										<rect
											x={landmark.x + 7}
											y={landmark.y + 5}
											width={landmark.width - 14}
											height={landmark.height - 10}
											fill="#fffdf6"
										/>
										<rect
											x={landmark.x + landmark.width / 2 - 6}
											y={landmark.y + landmark.height / 2 - 6}
											width="12"
											height="12"
											fill={color(index + 2)}
										/>
									</g>
								))}
							</>
						) : null}
					</g>
				</svg>
			))}
		</button>
	);
}
