import pino from 'pino';

const developmentLogging = process.env.COOP_DEV_LOG === '1';

export const logger = pino({
	base: { service: 'prism-bastion-coop-server' },
	level: developmentLogging ? 'info' : 'error',
});
