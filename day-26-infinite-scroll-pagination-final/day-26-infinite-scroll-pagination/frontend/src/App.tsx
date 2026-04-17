// src/App.tsx
// Root component. Sets up React Query client and renders the product list.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductList } from './components/ProductList.js';

// QueryClient configuration
// These defaults apply to all queries unless overridden at the query level
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus for this demo (annoying for UX during development)
      // In production, enable this to keep data fresh when user returns to tab
      refetchOnWindowFocus: false,

      // Retry failed requests up to 3 times before showing error
      // With exponential backoff: 1s, 2s, 4s delays
      retry: 3,

      // Data is considered stale after 30 seconds
      // Stale data is refetched in the background on next access
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    // QueryClientProvider makes the query client available to all child components
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <ProductList />
      </div>
    </QueryClientProvider>
  );
}

export default App;
