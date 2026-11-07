import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { type BaseSyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { login } from './authApi';
import { toErrorMessage } from '../../components/useEntityPage';
import { authStore, getStoredAdminCredentials, hasStoredAdminCredentials } from './authStore';

const LAST_USERNAME_KEY = 'supporter_last_username';
const AUTO_LOGIN_FAILED_MESSAGE = 'Reconnexion automatique impossible.';

function describeAutoLoginError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
    if (apiMessage) return apiMessage;
    if (!error.response) return 'Serveur injoignable.';
    if (error.response.status === 401) return 'Identifiants enregistres refuses.';
  }
  return toErrorMessage(error);
}

function describeUnreadableCredentials(): string {
  // crypto.subtle is only exposed in secure contexts (HTTPS or localhost).
  return window.isSecureContext
    ? 'Identifiants enregistres illisibles.'
    : 'Dechiffrement indisponible sur une connexion non securisee (HTTP).';
}

const loginSchema = z.object({
  username: z.string().min(1, 'Nom utilisateur requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setToken = authStore((s) => s.setToken);
  const [error, setError] = useState<string | null>(null);
  const manualLoginStartedRef = useRef(false);

  const initialUsername = useMemo(() => {
    const last = localStorage.getItem(LAST_USERNAME_KEY)?.trim();
    return last ?? '';
  }, []);

  const { register, handleSubmit, setValue, getFieldState, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: initialUsername, password: '' },
  });

  useEffect(() => {
    let cancelled = false;

    const reportAutoLoginFailure = (cause: string) => {
      if (cancelled || manualLoginStartedRef.current) {
        return;
      }
      setError(`${AUTO_LOGIN_FAILED_MESSAGE} ${cause}`);
    };

    const autoLogin = async () => {
      // getStoredAdminCredentials drops unreadable entries and returns null: an entry present
      // before the call but no credentials after means decryption failed.
      const hadStoredEntry = hasStoredAdminCredentials();
      const storedCredentials = await getStoredAdminCredentials();
      if (cancelled) {
        return;
      }
      if (!storedCredentials) {
        if (hadStoredEntry) {
          reportAutoLoginFailure(describeUnreadableCredentials());
        }
        return;
      }
      if (!getFieldState('username').isDirty) {
        setValue('username', storedCredentials.username);
      }

      const token = await login(storedCredentials.username, storedCredentials.password);
      if (cancelled) {
        return;
      }
      setToken(token);
      navigate((location.state as { from?: string } | undefined)?.from ?? '/admin/home', { replace: true });
    };

    // The manual login form stays available whatever the failure.
    void autoLogin().catch((autoLoginError: unknown) => {
      reportAutoLoginFailure(describeAutoLoginError(autoLoginError));
    });

    return () => {
      cancelled = true;
    };
  }, [getFieldState, location.state, navigate, setToken, setValue]);

  const onSubmit = async (values: LoginForm, event?: BaseSyntheticEvent) => {
    setError(null);
    try {
      // Read actual DOM values to avoid first-submit autofill desync with RHF state.
      const form = event?.target as HTMLFormElement | undefined;
      const formData = form ? new FormData(form) : null;
      const username = String(formData?.get('username') ?? values.username ?? '').trim();
      const password = String(formData?.get('password') ?? values.password ?? '');

      const token = await login(username, password);
      setToken(token);
      localStorage.setItem(LAST_USERNAME_KEY, username);
      const redirectTo = (location.state as { from?: string } | undefined)?.from ?? '/admin/home';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      let message = 'Connexion impossible.';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          message += ' Le serveur prend du temps a demarrer (Render free plan). Reessayez.';
        } else if (error.message) {
          message += ` ${error.message}`;
        } else {
          message += ' Verifiez vos identifiants.';
        }
      }
      setError(message);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack
            spacing={2}
            component="form"
            onSubmit={(event) => {
              // A manual attempt hides and supersedes any automatic re-login failure.
              manualLoginStartedRef.current = true;
              setError(null);
              return handleSubmit(onSubmit)(event);
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Administration</Typography>
            <Typography variant="body2" color="text.secondary">Connexion securisee</Typography>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              label="Utilisateur"
              {...register('username')}
              autoComplete="username"
              error={Boolean(errors.username)}
              helperText={errors.username?.message}
            />
            <TextField
              label="Mot de passe"
              type="password"
              {...register('password')}
              autoComplete="current-password"
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
            />

            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
