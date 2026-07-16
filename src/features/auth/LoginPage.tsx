import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { login } from './authApi';
import { authStore } from './authStore';

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: 'admin', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      const token = await login(values.username, values.password);
      setToken(token);
      const redirectTo = (location.state as { from?: string } | undefined)?.from ?? '/admin/natio';
      navigate(redirectTo, { replace: true });
    } catch {
      setError('Connexion impossible. Verifiez vos identifiants.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#eef2f6', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Administration</Typography>
            <Typography variant="body2" color="text.secondary">Connexion securisee</Typography>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              label="Utilisateur"
              {...register('username')}
              error={Boolean(errors.username)}
              helperText={errors.username?.message}
            />
            <TextField
              label="Mot de passe"
              type="password"
              {...register('password')}
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
