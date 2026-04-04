import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/theme-provider';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        'rounded-full border-2 border-foreground/15 bg-background/80 backdrop-blur-sm shrink-0',
        className,
      )}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
