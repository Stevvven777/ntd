import { WORLD, type LevelDefinition } from '@prism-bastion/game-core/game/config';
import styles from './LevelMap.module.css';

export function LevelMap({ level }: { level: LevelDefinition }) {
	return (
		<svg
			className={styles['level-map']}
			data-level-map
			viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}
			aria-hidden="true"
		>
			{level.graph.edges.map((edge) => {
				const start = level.graph.nodes.get(edge.from)?.position;
				const end = level.graph.nodes.get(edge.to)?.position;
				return start && end ? (
					<line
						className={styles['route-edge']}
						data-route-edge
						key={`${edge.from}:${edge.to}`}
						x1={start.x}
						y1={start.y}
						x2={end.x}
						y2={end.y}
					/>
				) : null;
			})}
			{[...level.graph.nodes.values()]
				.filter((node) => node.children.length > 1)
				.map((node) => (
					<circle
						className={styles['route-junction']}
						data-route-junction
						key={node.id}
						cx={node.position.x}
						cy={node.position.y}
						r="14"
					/>
				))}
			{level.towerPads.map((pad, index) => (
				<circle className={styles['tower-pad']} data-tower-pad key={index} cx={pad.x} cy={pad.y} r="17" />
			))}
		</svg>
	);
}
