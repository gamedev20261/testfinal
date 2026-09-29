import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from 'sonner';
import { queryClient, currentUserKey } from './lib/query-client';
import { setSessionEndedHandler } from './api/client';
import { router } from './router';

setSessionEndedHandler(() => queryClient.setQueryData(currentUserKey, null));

// The whole app: the API cache around the pages chosen by the router, plus pop-up messages
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  );
}
