import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi } from '../../api/auth';
import { currentUserKey } from '../../lib/query-client';

export { currentUserKey };

// The logged-in user: undefined while loading, null when logged out
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: authApi.me,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    meta: { inlineError: true }, // the login form shows the error itself
    // Store the user we got back, so pages know who is logged in without asking again
    onSuccess: (user) => queryClient.setQueryData(currentUserKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.logout,
    // Even if the request failed, forget everything loaded for this user and go to the login page
    onSettled: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
