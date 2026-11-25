import { IconButton, Stack, Tooltip } from '@mui/material';
import type { MouseEvent, ReactNode } from 'react';

export interface MiniAction {
  key: string;
  /** Accessible name of the button. */
  label: string;
  /** Tooltip text; defaults to `label`. */
  tooltip?: string;
  icon: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface MiniActionBarProps {
  actions: MiniAction[];
  /** Forwarded to every button (e.g. the `tabIndex` of a Data Grid cell). */
  tabIndex?: number;
}

/**
 * Rounded floating bar of small icon buttons (photo / logo frames, grid cells). Visibility on
 * hover or focus is left to the container.
 */
export function MiniActionBar({ actions, tabIndex }: MiniActionBarProps) {
  return (
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
      {actions.map((action) => (
        <Tooltip key={action.key} title={action.tooltip ?? action.label}>
          <IconButton size="small" onClick={action.onClick} aria-label={action.label} tabIndex={tabIndex}>
            {action.icon}
          </IconButton>
        </Tooltip>
      ))}
    </Stack>
  );
}
