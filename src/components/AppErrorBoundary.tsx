import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
  componentStack: string;
}

const INITIAL_STATE: AppErrorBoundaryState = { error: null, componentStack: '' };

/**
 * Filet de securite global: sans lui, une erreur de rendu demonte tout l'arbre React
 * et le navigateur affiche une page blanche sans aucune indication.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ componentStack: String(info.componentStack ?? '') });
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private handleCopy = async (): Promise<void> => {
    const { error, componentStack } = this.state;
    if (!error) return;
    try {
      await navigator.clipboard.writeText(`${error.message}\n${error.stack ?? ''}\n${componentStack}`);
    } catch {
      // Ignore clipboard failures to keep the error visible on screen.
    }
  };

  render(): ReactNode {
    const { error, componentStack } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        <Alert
          severity="error"
          action={(
            <Stack direction="row" spacing={0.5}>
              <Button size="small" color="inherit" startIcon={<ContentCopyOutlinedIcon />} onClick={() => void this.handleCopy()}>
                Copier
              </Button>
              <Button size="small" color="inherit" startIcon={<RefreshRoundedIcon />} onClick={() => window.location.reload()}>
                Recharger
              </Button>
            </Stack>
          )}
        >
          <AlertTitle>Une erreur inattendue a interrompu l&apos;affichage</AlertTitle>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error.message}
          </Typography>
        </Alert>
        {componentStack ? (
          <Typography
            variant="caption"
            color="text.secondary"
            component="pre"
            sx={{ mt: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflow: 'auto' }}
          >
            {componentStack}
          </Typography>
        ) : null}
      </Box>
    );
  }
}
