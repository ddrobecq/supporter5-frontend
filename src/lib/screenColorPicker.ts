export async function pickScreenColor(): Promise<string> {
  const EyeDropperConstructor = (window as Window & {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }).EyeDropper;

  if (!EyeDropperConstructor) {
    throw new Error('La pipette n est pas disponible dans ce navigateur.');
  }

  const result = await new EyeDropperConstructor().open();
  return result.sRGBHex;
}
