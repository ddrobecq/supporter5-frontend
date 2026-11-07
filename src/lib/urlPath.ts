/**
 * Encode une valeur dynamique destinee a un segment de chemin d'URL d'API.
 * Empeche qu'un identifiant contenant `/`, `..`, `?` ou `#` (ex: issu de useParams,
 * qui decode `%2F`) ne fasse cibler une autre route de l'API.
 */
export function encodePathSegment(value: string | number): string {
  return encodeURIComponent(String(value));
}
