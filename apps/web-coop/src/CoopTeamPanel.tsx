import { UiIcon } from '@prism-bastion/web-shared/ui/UiIcon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { CoopPlayerId, CoopPlayerSnapshot, CoopRoomSnapshot } from '@prism-bastion/coop/types';
import styles from './CoopTeamPanel.module.css';

interface CoopTeamPanelProps {
	room: CoopRoomSnapshot;
	playerId: CoopPlayerId;
	self: CoopPlayerSnapshot;
	peer: CoopPlayerSnapshot | null;
	viewedPlayer: CoopPlayerSnapshot | null;
	viewingPeer: boolean;
	canEdit: boolean;
	canViewPlayer: (playerId: CoopPlayerId) => boolean;
	onClose: () => void;
	onViewPlayer: (playerId: CoopPlayerId) => void;
	onTransferShards: (amount: number) => void;
}

const playerStatus = (t: TFunction, player: CoopPlayerSnapshot): string => {
	if (player.eliminated) {
		return t('coop.eliminated');
	}
	if (player.combatSubmitted) {
		return t('coop.defenseDone');
	}
	if (player.ready) {
		return t('coop.ready');
	}
	return player.connected ? t('coop.connected') : t('coop.reconnecting');
};

export function CoopTeamPanel({
	room,
	playerId,
	self,
	peer,
	viewedPlayer,
	viewingPeer,
	canEdit,
	canViewPlayer,
	onClose,
	onViewPlayer,
	onTransferShards,
}: CoopTeamPanelProps) {
	const { t } = useTranslation();
	const [transferAmount, setTransferAmount] = useState(20);

	return (
		<section className={styles.teamPanel} role="dialog" aria-labelledby="coop-team-console-title">
			<header>
				<div>
					<h2 id="coop-team-console-title">{t('coop.consoleTitle')}</h2>
					<p>
						{t('coop.room')} <b className={styles.code}>{room.code}</b> · {t(`coop.phase.${room.phase}`)}
					</p>
				</div>
				<button onClick={onClose} aria-label={t('coop.closeConsole')}>
					<UiIcon name="close" />
				</button>
			</header>
			<div className={styles.teamRoster}>
				{room.players.map((player) => {
					const status = playerStatus(t, player);
					return (
						<section
							className={player.id === playerId ? styles.localPlayer : styles.peerPlayer}
							key={player.id}
						>
							<div className={styles.playerName}>
								<span>{player.id === playerId ? t('coop.you') : t('coop.friend')}</span>
								<strong>{player.name}</strong>
							</div>
							<div className={styles.playerStats}>
								<b>
									<small>{t('coop.core')}</small>
									<span>
										<UiIcon name="heart" /> {player.plan.core}/{player.plan.maxCore}
									</span>
								</b>
								<b>
									<small>{t('coop.shards')}</small>
									<span>
										<UiIcon name="diamond" /> {player.plan.shards}
									</span>
								</b>
							</div>
							<p>{status}</p>
						</section>
					);
				})}
			</div>
			{peer && viewedPlayer ? (
				<div className={styles.viewSwitch} data-peer={viewingPeer}>
					<div>
						<small>{t('coop.viewingDefense')}</small>
						<strong>{viewedPlayer.name}</strong>
					</div>
					<button
						aria-pressed={viewingPeer}
						disabled={!canViewPlayer(viewingPeer ? self.id : peer.id)}
						onClick={() => onViewPlayer(viewingPeer ? self.id : peer.id)}
					>
						{viewingPeer ? t('coop.viewOwnDefense') : t('coop.viewPeerDefense', { name: peer.name })}
					</button>
				</div>
			) : null}
			{canEdit && peer && !peer.eliminated ? (
				<div className={styles.transfer}>
					<label>
						<span>{t('coop.transfer')}</span>
						<input
							type="number"
							min="1"
							max={self.plan.shards}
							value={transferAmount}
							onChange={(event) => setTransferAmount(Number(event.target.value))}
						/>
					</label>
					<button onClick={() => onTransferShards(Math.max(1, Math.floor(transferAmount)))}>
						{t('coop.transferAction', { name: peer.name })}
					</button>
				</div>
			) : null}
			{self.eliminated ? <p className={styles.spectating}>{t('coop.spectating')}</p> : null}
			<details className={styles.pool}>
				<summary>
					<span>{t('coop.sharedPool')}</span>
					<b>＋</b>
				</summary>
				<div className={styles.poolGrid}>
					{Object.entries(room.pool)
						.filter(([, count]) => count !== 'unlimited')
						.map(([moduleId, count]) => (
							<div key={moduleId}>
								<span>{t(`modules.${moduleId}.name`)}</span>
								<b>{count}</b>
							</div>
						))}
				</div>
			</details>
		</section>
	);
}
