import { ThemeProvider } from './app/ThemeContext.jsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import { PublicEntryRouter } from './routes/PublicEntryRouter.jsx';

export default function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <PublicEntryRouter />
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
