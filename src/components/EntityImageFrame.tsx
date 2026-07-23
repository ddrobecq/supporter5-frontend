import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import ContentPasteRoundedIcon from '@mui/icons-material/ContentPasteRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { Box, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useRef } from 'react';
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
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const file = new File([blob], 'clipboard-image', { type: imageType });
        const dataUrl = await readFileAsDataUrl(file);
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
        backgroundColor: '#f5f5f5',
        position: 'relative',
        '&:hover .entity-image-actions, &:focus-within .entity-image-actions': {
          opacity: 1,
          pointerEvents: 'auto',
        },
        ...sx,
      }}
    >
      {loading ? <CircularProgress size={40} /> : null}

      {!loading && src ? (
        <Box
          component="img"
          src={src}
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

      {!loading && !src ? fallback ?? null : null}

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
              bgcolor: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(2px)',
              borderRadius: 999,
              px: 0.5,
              py: 0.25,
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
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
