import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import ContentPasteRoundedIcon from '@mui/icons-material/ContentPasteRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { Box, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

interface EntityImageFrameProps {
  src?: string | null;
  alt: string;
  loading?: boolean;
  width: number | string;
  height: number | string;
  fallback?: ReactNode;
  overlay?: ReactNode;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  imageSx?: SxProps<Theme>;
  sx?: SxProps<Theme>;
  editable?: boolean;
  accept?: string;
  actionLabels?: {
    upload?: string;
    paste?: string;
    clear?: string;
  };
  onChangeImage?: (nextValue: string | null) => void;
  onActionError?: (message: string) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Erreur lors du chargement de l image.'));
    reader.readAsDataURL(file);
  });
}

function extractSvgMarkup(value: string): string {
  const text = value.trim();
  if (!text) return '';

  const lower = text.toLowerCase();
  const svgStart = lower.indexOf('<svg');
  if (svgStart < 0) return '';
  return text.slice(svgStart).trim();
}

function normalizeImageSource(src: string | null | undefined): string | null {
  if (!src) return null;

  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith('data:')) return trimmed;

  const svgText = extractSvgMarkup(trimmed);
  if (!svgText) return src;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
}

function resolveHtmlImageCandidates(html: string, baseUrl: string): string[] {
  const candidates = new Set<string>();
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/gi,
    /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:icon|image_src|preload)["'][^>]*>/gi,
    /(?:src|href)=["']([^"']+\.(?:svg|png|jpe?g|gif|bmp|webp))(?:\?[^"']*)?["']/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const candidate = match[1]?.trim();
      if (!candidate) continue;
      try {
        candidates.add(new URL(candidate, baseUrl).toString());
      } catch {
        candidates.add(candidate);
      }
    }
  }

  return Array.from(candidates);
}

async function resolveRemoteImageSource(input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith('data:')) return trimmed;
  if (!/^(https?:)?\/\//i.test(trimmed)) return null;

  try {
    const response = await fetch(trimmed, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') ?? '';
    const rawText = await response.text();

    if (contentType.includes('svg') || /<svg\b/i.test(rawText)) {
      const svgText = extractSvgMarkup(rawText);
      if (svgText) {
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
      }
    }

    if (contentType.startsWith('image/')) {
      const blob = await response.blob();
      const file = new File([blob], 'remote-image', { type: contentType || 'image/png' });
      return readFileAsDataUrl(file);
    }

    if (contentType.includes('text/html') || /<html\b/i.test(rawText)) {
      const candidates = resolveHtmlImageCandidates(rawText, trimmed);
      for (const candidate of candidates) {
        const resolved = await resolveRemoteImageSource(candidate);
        if (resolved) {
          return resolved;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function resolveClipboardTextPayload(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = trimmed.replace(/^\s+|\s+$/g, '');
  if (/^https?:\/\//i.test(candidate)) {
    return resolveRemoteImageSource(candidate);
  }

  const svgText = extractSvgMarkup(trimmed);
  if (svgText) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
  }

  if (trimmed.includes('<html') || trimmed.includes('<!doctype') || trimmed.includes('<img')) {
    const htmlCandidates = resolveHtmlImageCandidates(trimmed, 'https://example.invalid');
    for (const htmlCandidate of htmlCandidates) {
      const resolved = await resolveRemoteImageSource(htmlCandidate);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

async function resolveClipboardImagePayload(item: ClipboardItem): Promise<string | null> {
  const types = item.types ?? [];

  for (const type of types) {
    if (type === 'image/svg+xml' || type.includes('svg')) {
      const blob = await item.getType(type);
      const text = await blob.text();
      const svgText = extractSvgMarkup(text);
      if (svgText) {
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
      }
    }
  }

  for (const type of types) {
    if (type.includes('html') || type.includes('plain')) {
      const blob = await item.getType(type);
      const text = await blob.text();
      const payload = await resolveClipboardTextPayload(text);
      if (payload) {
        return payload;
      }
    }
  }

  const imageType = types.find((type) => type.startsWith('image/'));
  if (!imageType) {
    return null;
  }

  const blob = await item.getType(imageType);
  const file = new File([blob], 'clipboard-image', { type: imageType });
  return readFileAsDataUrl(file);
}

export function EntityImageFrame({
  src,
  alt,
  loading = false,
  width,
  height,
  fallback,
  overlay,
  objectFit = 'contain',
  objectPosition = 'center',
  imageSx,
  sx,
  editable = false,
  accept = 'image/*',
  actionLabels,
  onChangeImage,
  onActionError,
}: EntityImageFrameProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onActionError?.('Le fichier doit etre une image.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChangeImage?.(dataUrl);
    } catch {
      onActionError?.('Erreur lors du chargement de l image.');
    }
  };

  const handlePasteFromClipboard = async () => {
    if (!navigator.clipboard?.read) {
      onActionError?.('Le collage depuis le presse-papiers n est pas disponible.');
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const dataUrl = await resolveClipboardImagePayload(item);
        if (!dataUrl) {
          continue;
        }
        onChangeImage?.(dataUrl);
        return;
      }
      onActionError?.('Le presse-papiers ne contient pas d image.');
    } catch {
      onActionError?.('Impossible de coller une image depuis le presse-papiers.');
    }
  };

  const handleClearImage = () => {
    onChangeImage?.(null);
  };

  const [resolvedRemoteSrc, setResolvedRemoteSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      setResolvedRemoteSrc(null);
      return () => {
        cancelled = true;
      };
    }

    const trimmed = src.trim();
    if (!trimmed) {
      setResolvedRemoteSrc(null);
      return () => {
        cancelled = true;
      };
    }

    const shouldResolveRemote = /^https?:\/\//i.test(trimmed);
    if (!shouldResolveRemote) {
      setResolvedRemoteSrc(normalizeImageSource(trimmed));
      return () => {
        cancelled = true;
      };
    }

    void resolveRemoteImageSource(trimmed).then((resolved) => {
      if (!cancelled) {
        setResolvedRemoteSrc(resolved ?? trimmed);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const displaySrc = resolvedRemoteSrc ?? normalizeImageSource(src ?? null);
  const showActions = editable && typeof onChangeImage === 'function';

  return (
    <Box
      sx={{
        width,
        height,
        flexShrink: 0,
        border: '2px solid',
        borderColor: 'divider',
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        position: 'relative',
        '&:hover .entity-image-actions, &:focus-within .entity-image-actions': {
          opacity: 1,
          pointerEvents: 'auto',
        },
        ...sx,
      }}
    >
      {loading ? <CircularProgress size={40} /> : null}

      {!loading && displaySrc ? (
        <Box
          component="img"
          src={displaySrc}
          alt={alt}
          sx={{
            width: '100%',
            height: '100%',
            objectFit,
            objectPosition,
            ...imageSx,
          }}
        />
      ) : null}

      {!loading && !displaySrc ? fallback ?? null : null}

      {showActions ? (
        <Box
          className="entity-image-actions"
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 4,
            display: 'flex',
            justifyContent: 'center',
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 160ms ease',
            '.MuiIconButton-root': {
              pointerEvents: 'auto',
            },
          }}
        >
          <Stack
            direction="row"
            spacing={0.25}
            sx={{
              justifyContent: 'center',
              bgcolor: 'background.paper',
              backdropFilter: 'blur(2px)',
              borderRadius: 999,
              px: 0.5,
              py: 0.25,
              boxShadow: 2,
            }}
          >
            <Tooltip title={actionLabels?.upload ?? 'Importer une image'}>
              <IconButton size="small" onClick={handleUploadClick} aria-label={actionLabels?.upload ?? 'Importer une image'}>
                <UploadRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={actionLabels?.paste ?? 'Coller une image du presse-papiers'}>
              <IconButton size="small" onClick={() => void handlePasteFromClipboard()} aria-label={actionLabels?.paste ?? 'Coller une image'}>
                <ContentPasteRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={actionLabels?.clear ?? 'Supprimer l image'}>
              <IconButton size="small" onClick={handleClearImage} aria-label={actionLabels?.clear ?? 'Supprimer l image'}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <input ref={fileInputRef} type="file" hidden accept={accept} onChange={(event) => void handleFileChange(event)} />
        </Box>
      ) : null}

      {overlay ?? null}
    </Box>
  );
}
