// Petit registre d'evenements separe de natioStore pour eviter l'import circulaire
// natioApi -> natioStore -> natioApi.
const listeners = new Set<() => void>();

export function subscribeNatioChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyNatioChanged(): void {
  for (const listener of listeners) listener();
}
