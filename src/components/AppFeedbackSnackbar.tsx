import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { Alert, IconButton, Snackbar, Tooltip } from '@mui/material';

export interface FeedbackMessage {
  severity: 'success' | 'error';
  message: string;
}

interface AppFeedbackSnackbarProps {
  value: FeedbackMessage | null;
  onClose: () => void;
  autoHideDuration?: number;
}

export function AppFeedbackSnackbar({
  value,
  onClose,
  autoHideDuration = 3500,
}: AppFeedbackSnackbarProps) {
  const handleCopy = async () => {
    if (!value || value.severity !== 'error') return;
    try {
      await navigator.clipboard.writeText(value.message);
    } catch {
      // Ignore clipboard failures to avoid replacing the original error toast.
    }
  };

  return (
    <Snackbar
      open={Boolean(value)}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      {value ? (
        <Alert
          severity={value.severity}
          action={value.severity === 'error' ? (
            <Tooltip title="Copier dans le presse-papiers">
              <IconButton
                size="small"
                color="inherit"
                aria-label="Copier dans le presse-papiers"
                onClick={() => void handleCopy()}
              >
                <ContentCopyOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : undefined}
        >
          {value.message}
        </Alert>
      ) : <span />}
    </Snackbar>
  );
}
