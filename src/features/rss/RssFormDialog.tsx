import { Box, Button, Stack, TextField } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { useDirtySignature } from '../../lib/useDirtySignature';
import type { RssRow } from './types';

interface RssFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  primaryKey?: string;
  initialData?: RssRow;
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: RssRow) => Promise<void>;
  saveCount?: number;
}

export function RssFormDialog({
  open,
  mode,
  embedded = false,
  primaryKey,
  initialData,
  onDirtyChange,
  onClose,
  onSubmit,
  saveCount = 0,
}: RssFormDialogProps) {
  const [values, setValues] = useState<RssRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { setInitialSignature, syncDirty, markClean } = useDirtySignature(open, onDirtyChange);

  useEffect(() => {
    if (!open) return;
    const initial: RssRow = {
      RSSID: initialData?.RSSID ?? '',
      RSSURL: initialData?.RSSURL ?? '',
      RSSDescription: initialData?.RSSDescription ?? '',
    };
    setValues(initial);
    setInitialSignature(JSON.stringify(initial));
    setErrors({});
  }, [open, initialData]);

  useEffect(() => {
    syncDirty(JSON.stringify(values));
  }, [syncDirty, values]);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    const url = String(values.RSSURL ?? '').trim();
    if (!url) {
      nextErrors.RSSURL = 'URL requis';
    } else {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('invalid protocol');
        }
      } catch {
        nextErrors.RSSURL = 'URL HTTP(S) invalide';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: RssRow = {
        ...values,
        RSSID: values.RSSID !== '' && values.RSSID !== null && values.RSSID !== undefined ? Number(values.RSSID) : undefined,
      };
      if (payload.RSSID === undefined || Number.isNaN(payload.RSSID as number)) {
        delete payload.RSSID;
      }
      await onSubmit(payload);
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
      <TextField
        label="Identifiant"
        value={String(values.RSSID ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, RSSID: e.target.value }))}
        size="small"
        fullWidth
        disabled={mode === 'edit' && primaryKey === 'RSSID'}
      />
      <TextField
        label="Description"
        value={String(values.RSSDescription ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, RSSDescription: e.target.value }))}
        size="small"
        fullWidth
      />
      <TextField
        label="URL du flux"
        value={String(values.RSSURL ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, RSSURL: e.target.value }))}
        size="small"
        fullWidth
        error={Boolean(errors.RSSURL)}
        helperText={errors.RSSURL}
      />
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
      title={mode === 'create' ? 'Nouveau flux RSS' : 'Modifier un flux RSS'}
      saving={saving}
      onSave={() => void handleSave()}
      saveLabel="Enregistrer"
    >
      {content}
    </EntityFormDialog>
  );
}
