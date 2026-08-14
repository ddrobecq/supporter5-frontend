import { Box } from '@mui/material';
import { HeureGridEditorCell } from '../../components/HeureGridEditorCell';
import {
  formatHeureDisplay,
} from '../../components/heureUtils';

export interface HeureCellProps {
  value: unknown;
  isEditing: boolean;
  draftDigits: string;
  onStartEdit: () => void;
  onDraftChange: (nextDigits: string) => void;
  onCommit: () => Promise<unknown> | void;
  onCancel: () => void;
  onMoveVertical: (direction: 'up' | 'down') => Promise<unknown> | void;
  onTabOut?: (direction: 'next' | 'prev') => void;
}

export {
  normalizeHeureDigits,
  sanitizeHeureDigits,
  isValidHeureDigits,
  formatHeureDisplay,
  heureDigitsToApiValue,
} from '../../components/heureUtils';

export function HeureCell({ value, isEditing, draftDigits, onStartEdit, onDraftChange, onCommit, onCancel, onMoveVertical, onTabOut }: HeureCellProps) {
  if (isEditing) {
    return (
      <HeureGridEditorCell
        digits={draftDigits}
        onDigitsChange={onDraftChange}
        onCommit={onCommit}
        onCancel={onCancel}
        onMoveVertical={onMoveVertical}
        onTabOut={onTabOut}
        width={52}
      />
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
        cursor: 'text',
      }}
      onClick={(event) => {
        event.stopPropagation();
        onStartEdit();
      }}
    >
      {formatHeureDisplay(value)}
    </Box>
  );
}
