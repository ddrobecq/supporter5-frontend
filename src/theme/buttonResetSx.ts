/** Neutralise le style natif d'un <button> pour qu'il garde l'apparence de l'element qu'il remplace, avec un focus clavier visible. */
export const buttonResetSx = {
  appearance: 'none',
  m: 0,
  p: 0,
  border: 0,
  bgcolor: 'transparent',
  color: 'inherit',
  textAlign: 'inherit',
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2,
  },
} as const;

/** Variante pour un conteneur (Box/Stack): herite aussi de la police du parent. Ne pas utiliser sur Typography (ecraserait la variante). */
export const containerButtonResetSx = {
  ...buttonResetSx,
  font: 'inherit',
} as const;
