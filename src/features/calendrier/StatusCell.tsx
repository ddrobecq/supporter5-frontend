import { MenuItem, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

const STATUS_OPTIONS = [
  { value: 1, label: 'En attente' },
  { value: 2, label: 'En cours' },
  { value: 3, label: 'Terminee' },
  { value: 5, label: 'Programmee' },
  { value: 4, label: 'Non jouee' },
] as const;

export interface StatusCellProps {
  value: number;
  isEditing: boolean;
  draftValue: number;
  onStartEdit: () => void;
  onDraftChange: (nextValue: number) => void;
  onCommit: (nextValue?: number) => Promise<void> | void;
  onCancel: () => void;
}

function getStatusLabel(value: number): string {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? `Etat ${value}`;
}

export function StatusCell({ value, isEditing, draftValue, onStartEdit, onDraftChange, onCommit, onCancel }: StatusCellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      void onCommit();
    }
  };

  if (isEditing) {
    return (
      <Stack
        direction="row"
        spacing={0}
        sx={{ width: '100%', height: '100%', alignItems: 'center' }}
      >
        <TextField
          select
          value={draftValue}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            onDraftChange(nextValue);
            void onCommit(nextValue);
          }}
          size="small"
          autoFocus
          variant="outlined"
          slotProps={{
            select: {
              open: menuOpen,
              onOpen: () => setMenuOpen(true),
              onClose: () => {
                setMenuOpen(false);
              },
            },
            htmlInput: {
              style: { padding: '2px 4px', fontSize: '0.72rem' },
            },
          }}
          sx={{
            width: '100%',
            '& .MuiOutlinedInput-root': {
              height: 22,
              bgcolor: 'grey.200',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 0,
            },
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
              border: 0,
            },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              border: 0,
            },
          }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={0}
      sx={{ width: '100%', height: '100%', alignItems: 'center' }}
      onClick={(event) => {
        event.stopPropagation();
        onStartEdit();
      }}
    >
      {getStatusLabel(Number(value))}
    </Stack>
  );
}
