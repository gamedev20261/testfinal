import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage } from '../api/client';

// The cache key for "who is logged in?"
export const currentUserKey = ['auth', 'me'] as const;

// The cache for everything loaded from the API. One for the whole app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // an answer counts as fresh for 30 s: other components reuse it without asking again
      retry: 1, // a failed request is tried once more before showing an error
    },
  },
  // Any failed save shows a red message, unless the form shows the error itself (meta.inlineError)
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.options.meta?.inlineError) toast.error(apiErrorMessage(error));
    },
  }),
});

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { inlineError?: boolean };
  }
}
