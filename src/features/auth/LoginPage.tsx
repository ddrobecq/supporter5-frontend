import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    if (error.response.status === 401) return 'Identifiants enregistrés refusés.';
  }
  return toErrorMessage(error);
}

function describeUnreadableCredentials(): string {
  // crypto.subtle is only exposed in secure contexts (HTTPS or localhost).
  return window.isSecureContext
    ? 'Identifiants enregistrés illisibles.'
    : 'Déchiffrement indisponible sur une connexion non sécurisée (HTTP).';
}

type LoginField = 'username' | 'password';
type LoginFieldErrors = Partial<Record<LoginField, string>>;

const REQUIRED_MESSAGES: Record<LoginField, string> = {
  username: 'Nom utilisateur requis',
  password: 'Mot de passe requis',
};

// Same rule as the former z.string().min(1): checked on the raw (untrimmed) value.
function validateField(field: LoginField, value: string): string | undefined {
  return value.length < 1 ? REQUIRED_MESSAGES[field] : undefined;
}

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

  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Like the former reValidateMode 'onChange': fields are re-validated on change once a submit was attempted.
  const submitAttemptedRef = useRef(false);

  const handleFieldChange = (field: LoginField, value: string) => {
    if (field === 'username') {
      setUsername(value);
    } else {
      setPassword(value);
    }
    if (submitAttemptedRef.current) {
      setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
    }
  };

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
      // Keep a username already modified by the user (value differing from its initial value).
      setUsername((current) => (current === initialUsername ? storedCredentials.username : current));

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
  }, [initialUsername, location.state, navigate, setToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A manual attempt hides and supersedes any automatic re-login failure.
    manualLoginStartedRef.current = true;
    submitAttemptedRef.current = true;
    setError(null);

    // Read actual DOM values to avoid first-submit autofill desync with React state.
    const formData = new FormData(event.currentTarget);
    const rawUsername = String(formData.get('username') ?? username);
    const rawPassword = String(formData.get('password') ?? password);

    const fieldErrors: LoginFieldErrors = {
      username: validateField('username', rawUsername),
      password: validateField('password', rawPassword),
    };
    setErrors(fieldErrors);
    if (fieldErrors.username || fieldErrors.password) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submittedUsername = rawUsername.trim();
      const token = await login(submittedUsername, rawPassword);
      setToken(token);
      localStorage.setItem(LAST_USERNAME_KEY, submittedUsername);
      const redirectTo = (location.state as { from?: string } | undefined)?.from ?? '/admin/home';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      let message = 'Connexion impossible.';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          message += ' Le serveur prend du temps à démarrer (Render free plan). Réessayez.';
        } else if (error.message) {
          message += ` ${error.message}`;
        } else {
          message += ' Vérifiez vos identifiants.';
        }
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack
            spacing={2}
            component="form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              void handleSubmit(event);
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Administration</Typography>
            <Typography variant="body2" color="text.secondary">Connexion sécurisée</Typography>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              label="Utilisateur"
              name="username"
              value={username}
              onChange={(event) => handleFieldChange('username', event.target.value)}
              autoComplete="username"
              error={Boolean(errors.username)}
              helperText={errors.username}
            />
            <TextField
              label="Mot de passe"
              type="password"
              name="password"
              value={password}
              onChange={(event) => handleFieldChange('password', event.target.value)}
              autoComplete="current-password"
              error={Boolean(errors.password)}
              helperText={errors.password}
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
