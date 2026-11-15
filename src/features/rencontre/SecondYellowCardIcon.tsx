import { createSvgIcon } from '@mui/material/utils';

/**
 * Deux cartons en éventail : rouge derrière, jaune devant.
 * Couleurs en dur (indépendantes de la prop `color`) ; le liseré blanc détache le jaune du rouge.
 */
const SecondYellowCardIcon = createSvgIcon(
  <>
    <rect x="5" y="3" width="10" height="15" rx="1.6" transform="rotate(-12 10 18)" fill="#dc2626" />
    <rect
      x="9"
      y="4"
      width="10"
      height="15"
      rx="1.6"
      transform="rotate(12 14 19)"
      fill="#eab308"
      stroke="#ffffff"
      strokeWidth="1.2"
    />
  </>,
  'SecondYellowCard',
);

export default SecondYellowCardIcon;
