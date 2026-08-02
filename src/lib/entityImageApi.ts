import { http } from './http';

export async function updateEntityImage(
  entityType: string,
  id: string | number,
  image: string | null,
): Promise<void> {
  await http.put(`/api/admin/images/${encodeURIComponent(entityType)}/${encodeURIComponent(String(id))}`, {
    image,
  });
}

export async function updateEntityImageWithFallback(
  entityType: string,
  id: string | number,
  image: string | null,
  fallback: () => Promise<void>,
): Promise<void> {
  try {
    await updateEntityImage(entityType, id, image);
  } catch {
    await fallback();
  }
}

export function normalizeImagePayload(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}
