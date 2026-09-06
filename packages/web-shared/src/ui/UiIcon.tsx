import styles from './UiIcon.module.css';

type UiIconName = 'heart' | 'diamond' | 'diamondFilled' | 'play' | 'pause' | 'close' | 'external';

const paths: Record<UiIconName, string> = {
  heart: 'M12 21 3.5 12.5C-2 7 5.5 0 12 6.5 18.5 0 26 7 20.5 12.5Z',
  diamond: 'M12 2 22 12 12 22 2 12Z',
  diamondFilled: 'M12 2 22 12 12 22 2 12Z',
  play: 'M6 3 21 12 6 21Z',
  pause: 'M5 3H10V21H5ZM14 3H19V21H14Z',
  close: 'M5 5 19 19M19 5 5 19',
  external: 'M5 19 19 5M5 5H19V19',
};

/** Decorative icons inherit the surrounding label's color and font size. */
export function UiIcon({ name }: { name: UiIconName }) {
  const filled = name === 'heart' || name === 'play' || name === 'pause' || name === 'diamondFilled';
  return <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    className={styles.icon}
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth="2"
    strokeLinejoin="miter"
    aria-hidden="true"
    focusable="false"
  ><path d={paths[name]} /></svg>;
}
