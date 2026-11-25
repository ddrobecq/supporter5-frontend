import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Box, ButtonBase, ClickAwayListener } from '@mui/material';
import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { MiniActionBar, type MiniAction } from '../../components/MiniActionBar';

const ACTIONS_CLASS = 'tour-malus-actions';

interface TourParticipantMalusCellProps {
  /** Sum of the participant's malus points (0 = none). */
  total: number;
  clubLabel: string;
  /** True when the grid cell holds the keyboard focus. */
  hasFocus: boolean;
  /** Data Grid roving tabIndex of the cell, forwarded to the inner buttons. */
  tabIndex: number;
  onOpenList: () => void;
  onAdd: () => void;
  onClearAll: () => void;
}

/** Clicks and activation keys are handled here, never by the grid (selection stays unchanged). */
function stopGridClick(event: MouseEvent) {
  event.stopPropagation();
}

function stopGridActivationKey(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation();
  }
}

export function TourParticipantMalusCell({
  total,
  clubLabel,
  hasFocus,
  tabIndex,
  onOpenList,
  onAdd,
  onClearAll,
}: TourParticipantMalusCellProps) {
  // Touch screens have no hover: a tap on the cell reveals the actions until the next tap elsewhere.
  const [revealed, setRevealed] = useState(false);
  const hasMalus = total > 0;

  const actions: MiniAction[] = [
    {
      key: 'add',
      label: `Ajouter un malus à ${clubLabel}`,
      tooltip: 'Ajouter un malus',
      icon: <AddCircleOutlineRoundedIcon fontSize="small" />,
      onClick: () => {
        setRevealed(false);
        onAdd();
      },
    },
  ];
  if (hasMalus) {
    actions.push(
      {
        key: 'edit',
        label: `Modifier les malus de ${clubLabel}`,
        tooltip: 'Modifier les malus',
        icon: <EditOutlinedIcon fontSize="small" />,
        onClick: () => {
          setRevealed(false);
          onOpenList();
        },
      },
      {
        key: 'clear',
        label: `Supprimer tous les malus de ${clubLabel}`,
        tooltip: 'Supprimer les malus',
        icon: <DeleteOutlineRoundedIcon fontSize="small" />,
        onClick: () => {
          setRevealed(false);
          onClearAll();
        },
      },
    );
  }

  const content = (
    <Box
      onClick={(event) => {
        stopGridClick(event);
        setRevealed(true);
      }}
      onKeyDown={stopGridActivationKey}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        [`&:hover .${ACTIONS_CLASS}, &:focus-within .${ACTIONS_CLASS}`]: {
          opacity: 1,
          pointerEvents: 'auto',
        },
      }}
    >
      {hasMalus ? (
        <ButtonBase
          tabIndex={tabIndex}
          aria-label={`Voir les malus de ${clubLabel} (${total} points)`}
          onClick={(event) => {
            stopGridClick(event);
            onOpenList();
          }}
          sx={{ px: 0.5, borderRadius: 0.5, color: 'error.main', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
        >
          {`−${total}`}
        </ButtonBase>
      ) : null}
      <Box
        className={ACTIONS_CLASS}
        onClick={stopGridClick}
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          opacity: hasFocus || revealed ? 1 : 0,
          pointerEvents: hasFocus || revealed ? 'auto' : 'none',
          transition: 'opacity 160ms ease',
        }}
      >
        <MiniActionBar actions={actions} tabIndex={tabIndex} />
      </Box>
    </Box>
  );

  return revealed ? (
    <ClickAwayListener onClickAway={() => setRevealed(false)}>{content}</ClickAwayListener>
  ) : content;
}
