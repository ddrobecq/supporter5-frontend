import {
  Button,
  Box,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { useDirtySignature } from '../../lib/useDirtySignature';
import { useEntityImage } from '../../lib/useEntityImage';
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

interface NatioFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  fields: string[];
  primaryKey?: string;
  initialData?: NatioRow;
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: NatioRow) => Promise<void>;
  saveCount?: number;
}

export function NatioFormDialog({
  open,
  mode,
  embedded = false,
  fields,
  primaryKey,
  initialData,
  onDirtyChange,
  onClose,
  onSubmit,
  saveCount = 0,
}: NatioFormDialogProps) {
  const [values, setValues] = useState<NatioRow>({});
  const [saving, setSaving] = useState(false);
  const [flagPreview, setFlagPreview] = useState('');
  const [flagSvgContent, setFlagSvgContent] = useState('');
  const [flagCleared, setFlagCleared] = useState(false);
  const [imageRefreshToken, setImageRefreshToken] = useState(0);
  const editId = mode === 'edit' && primaryKey ? (initialData?.[primaryKey] as string | number | undefined) : undefined;
  const existingFlagImage = useEntityImage('natio', editId, imageRefreshToken);
  const displayFlagSrc = flagSvgContent.trim() ? flagPreview : flagCleared ? '' : (existingFlagImage.src ?? '');
  const { setInitialSignature, syncDirty, markClean } = useDirtySignature(open, onDirtyChange);

  const labelsByField: Record<string, string> = {
    IDNATIO: 'Identifiant',
    NATIO: 'Identifiant',
    CODE: 'Identifiant',
    PAYS: 'Nom',
    NOM: 'Nom',
    NALOCAL: 'Pays local',
    CODE_ISO: 'Code ISO',
    NAT_ISO: 'Code ISO',
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
  const codeIsoField = useMemo(
    () => resolvedFields.find((field) => field === 'NAT_ISO'),
    [resolvedFields],
  );
  const flagField = useMemo(
    () => resolvedFields.find((field) => field === 'NAT_DRAPEAU'),
    [resolvedFields],
  );
  const customFields = useMemo(
    () => new Set([codeField, nameField, localField, codeIsoField, flagField].filter(Boolean) as string[]),
    [codeField, nameField, localField, codeIsoField, flagField],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const initial: NatioRow = {};
    for (const field of resolvedFields) {
      initial[field] = (initialData?.[field] as string | number | null | undefined) ?? '';
    }

    const rawFlagValue = initial.NAT_DRAPEAU;
    const resolvedSvg = asSvgText(rawFlagValue);
    setValues(initial);
    setFlagSvgContent('');
    setFlagPreview('');
    setFlagCleared(false);

    const signature = JSON.stringify({ ...initial, NAT_DRAPEAU: resolvedSvg.trim() || '' });
    setInitialSignature(signature);
  }, [open, resolvedFields, initialData]);

  useEffect(() => {
    const currentSignature = JSON.stringify({ ...values, NAT_DRAPEAU: flagSvgContent.trim() || (flagCleared ? '_cleared_' : '') });
    syncDirty(currentSignature);
  }, [flagCleared, flagSvgContent, syncDirty, values]);

  const handleFlagImageChange = (nextValue: string | null) => {
    if (nextValue === null) {
      setFlagSvgContent('');
      setFlagPreview('');
      setFlagCleared(true);
      return;
    }
    const svgText = asSvgText(nextValue);
    if (svgText) {
      setFlagSvgContent(svgText);
      setFlagPreview(svgToDataUrl(svgText));
    } else {
      // Non-SVG image (e.g. pasted PNG) — store data URL directly
      setFlagSvgContent(nextValue);
      setFlagPreview(nextValue);
    }
    setFlagCleared(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: NatioRow = { ...values };
      if (flagField) {
        if (flagSvgContent.trim()) {
          payload[flagField] = flagSvgContent.trim();
        } else if (flagCleared) {
          payload[flagField] = null;
        } else {
          delete payload[flagField];
        }
      }
      await onSubmit(payload);
      if (mode === 'edit') {
        setFlagSvgContent('');
        setFlagPreview('');
        setFlagCleared(false);
        setImageRefreshToken((prev) => prev + 1);
      }
      markClean();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => { if (saveCount > 0) void handleSaveRef.current(); }, [saveCount]);

  const content = (
    <>
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
            <EntityImageFrame
              width={180}
              height={120}
              loading={!flagSvgContent && !flagCleared && existingFlagImage.loading}
              src={displayFlagSrc || null}
              alt="Apercu du drapeau"
              objectFit="contain"
              editable
              accept=".svg,image/svg+xml,image/*"
              onChangeImage={handleFlagImageChange}
              actionLabels={{
                upload: 'Importer un drapeau SVG',
                paste: 'Coller un drapeau depuis le presse-papiers',
                clear: 'Supprimer le drapeau',
              }}
              fallback={<FlagRoundedIcon sx={{ width: '100%', height: '100%', p: 1.5, color: 'text.disabled' }} />}
              sx={{ border: '1px solid', borderColor: 'divider', justifySelf: 'start' }}
            />

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
                />
              ) : null}

              {codeIsoField ? (
                <TextField
                  label={labelsByField[codeIsoField]}
                  value={String(values[codeIsoField] ?? '')}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 3).toUpperCase();
                    setValues((prev) => ({ ...prev, [codeIsoField]: next }));
                  }}
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 3 } }}
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
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Stack spacing={2}>
          {content}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} color="inherit">Annuler</Button>
            <Button onClick={() => void handleSave()} variant="contained" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  }

  return (
    <EntityFormDialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nouveau Pays' : 'Modifier un Pays'}
      saving={saving}
      onSave={() => void handleSave()}
      saveLabel="Enregistrer"
    >
      {content}
    </EntityFormDialog>
  );
}
