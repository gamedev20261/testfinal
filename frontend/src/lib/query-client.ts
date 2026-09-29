import { QueryClient } from '@tanstack/react-query';

// The cache for everything loaded from the API. One for the whole app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // an answer counts as fresh for 30 s: other components reuse it without asking again
      retry: 1, // a failed request is tried once more before showing an error
    },
  },
});
