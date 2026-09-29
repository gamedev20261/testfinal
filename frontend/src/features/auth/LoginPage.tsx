import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/ui/FormField';
import { apiErrorMessage } from '../../api/client';
import { loginSchema, type LoginValues } from './login-schema';
import { useCurrentUser, useLogin } from './use-auth';

export function LoginPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { data: user } = useCurrentUser();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  // The page the user wanted before being sent here (set by RequireAuth), or the start page
  const from: string = location.state?.from ?? '/';

  // Runs only when every field is valid
  async function onSubmit(values: LoginValues) {
    try {
      await login.mutateAsync(values);
      navigate(from, { replace: true });
    } catch (error) {
      // e.g. 401 "Invalid email or password" or 429 "Too many failed logins…"
      setError('root', { message: apiErrorMessage(error, 'Could not sign in') });
    }
  }

  // Already logged in: nothing to do here
  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary-light p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-white p-8 shadow-lg">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-white">G</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">GeoAnnotator</h1>
          <p className="mt-1 text-xs text-text-secondary">Information Extraction System</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="name@organization.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
          </FormField>

          <FormField label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
          </FormField>

          {errors.root && (
            <p role="alert" className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-text-secondary">
          User registration is restricted to the{' '}
          <span className="font-medium text-text-primary">Admin Portal</span>.
        </p>
      </div>
    </main>
  );
}
