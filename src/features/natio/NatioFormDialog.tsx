import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useEffect, useMemo, useState } from 'react';
import type { NatioRow } from './types';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function extractSvgMarkup(text: string): string {
  const lower = text.toLowerCase();
  const svgStart = lower.indexOf('<svg');
  if (svgStart < 0) return '';
  return text.slice(svgStart).trim();
}

function decodeBase64Utf8(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function asSvgText(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (trimmed.toLowerCase().startsWith('data:image/svg+xml')) {
      const commaIndex = trimmed.indexOf(',');
      if (commaIndex < 0) return '';

      const meta = trimmed.substring(0, commaIndex).toLowerCase();
      const payload = trimmed.substring(commaIndex + 1);

      if (meta.includes(';base64')) {
        const decoded = decodeBase64Utf8(payload);
        return extractSvgMarkup(decoded);
      }

      const decoded = decodeURIComponent(payload);
      return extractSvgMarkup(decoded);
    }

    return extractSvgMarkup(trimmed);
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
    const bytes = new Uint8Array(value);
    const text = new TextDecoder().decode(bytes).trim();
    return extractSvgMarkup(text);
  }

  if (value && typeof value === 'object' && 'buffer' in (value as Record<string, unknown>)) {
    const candidate = (value as { buffer?: unknown }).buffer;
    if (Array.isArray(candidate) && candidate.every((item) => typeof item === 'number')) {
      const bytes = new Uint8Array(candidate);
      const text = new TextDecoder().decode(bytes).trim();
      return extractSvgMarkup(text);
    }
  }

  if (value && typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
    const candidate = (value as { data?: unknown }).data;
    if (Array.isArray(candidate) && candidate.every((item) => typeof item === 'number')) {
      const bytes = new Uint8Array(candidate);
      const text = new TextDecoder().decode(bytes).trim();
      return extractSvgMarkup(text);
    }
  }

  return '';
}

function asPreviewSrc(value: unknown): string {
  const svgText = asSvgText(value);
  if (svgText) return svgToDataUrl(svgText);
  if (typeof value === 'string') return value.trim();
  return '';
}

interface NatioFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  fields: string[];
  primaryKey?: string;
  initialData?: NatioRow;
  onClose: () => void;
  onSubmit: (payload: NatioRow) => Promise<void>;
}

export function NatioFormDialog({
  open,
  mode,
  fields,
  primaryKey,
  initialData,
  onClose,
  onSubmit,
}: NatioFormDialogProps) {
  const [values, setValues] = useState<NatioRow>({});
  const [saving, setSaving] = useState(false);
  const [flagPreview, setFlagPreview] = useState('');
  const [flagSvgContent, setFlagSvgContent] = useState('');

  const labelsByField: Record<string, string> = {
    IDNATIO: 'Code',
    NATIO: 'Code',
    CODE: 'Code',
    PAYS: 'Nom',
    NOM: 'Nom',
    NALOCAL: 'Pays local',
    NAT_DRAPEAU: 'Drapeau (SVG)',
  };

  const resolvedFields = useMemo(() => {
    if (fields.length > 0) {
      return fields;
    }
    if (initialData) {
      return Object.keys(initialData);
    }
    return [];
  }, [fields, initialData]);

  const codeField = useMemo(
    () => resolvedFields.find((field) => ['IDNATIO', 'NATIO', 'CODE'].includes(field)),
    [resolvedFields],
  );
  const nameField = useMemo(
    () => resolvedFields.find((field) => ['PAYS', 'NOM', 'NATIO_NOM'].includes(field)),
    [resolvedFields],
  );
  const localField = useMemo(
    () => resolvedFields.find((field) => field === 'NALOCAL'),
    [resolvedFields],
  );
  const flagField = useMemo(
    () => resolvedFields.find((field) => field === 'NAT_DRAPEAU'),
    [resolvedFields],
  );
  const customFields = useMemo(
    () => new Set([codeField, nameField, localField, flagField].filter(Boolean) as string[]),
    [codeField, nameField, localField, flagField],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const initial: NatioRow = {};
    for (const field of resolvedFields) {
      initial[field] = (initialData?.[field] as string | number | null | undefined) ?? '';
    }
    setValues(initial);
    const rawFlagValue = initial.NAT_DRAPEAU;
    setFlagSvgContent(asSvgText(rawFlagValue));
    setFlagPreview(asPreviewSrc(rawFlagValue));
  }, [open, resolvedFields, initialData]);

  const handleFlagFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const svgText = typeof reader.result === 'string' ? reader.result.trim() : '';
      if (!svgText) return;

      setFlagSvgContent(svgText);
      setFlagPreview(svgToDataUrl(svgText));
    };
    reader.readAsText(file);

    // Allow selecting the same file twice in a row.
    event.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: NatioRow = { ...values };
      if (flagField) {
        if (flagSvgContent.trim()) {
          payload[flagField] = flagSvgContent.trim();
        } else {
          delete payload[flagField];
        }
      }
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Nouveau Pays' : 'Modifier un Pays'}</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5 }}>
          <Stack spacing={2} sx={{ width: '100%' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 180px) minmax(0, 1fr)',
                columnGap: 2,
                rowGap: 2,
                alignItems: 'start',
                width: '100%',
              }}
            >
            <Box
              sx={{
                width: 180,
                maxWidth: '100%',
                aspectRatio: '3 / 2',
                bgcolor: 'grey.100',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                justifySelf: 'start',
              }}
            >
              {flagPreview.trim() ? (
                <Box
                  component="img"
                  src={flagPreview}
                  alt="Apercu du drapeau"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                  }}
                />
              ) : (
                <Box sx={{ color: 'text.secondary', fontSize: 12, px: 1, textAlign: 'center' }}>
                  Apercu drapeau 3:2
                </Box>
              )}

              <IconButton
                component="label"
                size="small"
                aria-label="Importer un drapeau SVG"
                sx={{
                  position: 'absolute',
                  right: 2,
                  bottom: 2,
                  width: 22,
                  height: 22,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                <UploadFileOutlinedIcon sx={{ fontSize: 14 }} />
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  hidden
                  onChange={handleFlagFileChange}
                />
              </IconButton>
            </Box>

            <Stack
              spacing={1}
              sx={{
                gridColumn: 2,
                minWidth: 0,
                width: '100%',
                justifySelf: 'stretch',
                alignItems: 'stretch',
                mt: 0.5,
              }}
            >
              {codeField ? (
                <TextField
                  label={labelsByField[codeField] ?? codeField}
                  value={String(values[codeField] ?? '')}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 3);
                    setValues((prev) => ({ ...prev, [codeField]: next }));
                  }}
                  disabled={mode === 'edit' && primaryKey === codeField}
                  size="small"
                  fullWidth
                  inputProps={{ maxLength: 3 }}
                  InputLabelProps={{ shrink: true }}
                />
              ) : null}

              {localField ? (
                <FormControlLabel
                  label={labelsByField[localField]}
                  control={
                    <Switch
                      checked={Boolean(Number(values[localField] ?? 0))}
                      onChange={(_, checked) => setValues((prev) => ({ ...prev, [localField]: checked ? 1 : 0 }))}
                    />
                  }
                  sx={{ ml: 0 }}
                />
              ) : null}
            </Stack>

            {nameField ? (
              <TextField
                sx={{ gridColumn: '1 / -1' }}
                label={labelsByField[nameField] ?? nameField}
                value={(values[nameField] as string | number | undefined) ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [nameField]: e.target.value }))}
                fullWidth
                size="small"
              />
            ) : null}
            </Box>

            {resolvedFields.filter((field) => !customFields.has(field)).map((field) => (
              <TextField
                key={field}
                label={labelsByField[field] ?? field}
                value={(values[field] as string | number | undefined) ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                disabled={mode === 'edit' && primaryKey === field}
                fullWidth
                size="small"
              />
            ))}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Enregistrement...' : 'OK'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
