import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PeerPulseLogoMark } from '@/components/peer-pulse-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function Starburst({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M60 0L68 42L110 34L78 60L110 86L68 78L60 120L52 78L10 86L42 60L10 34L52 42Z" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/login', {
        ...data,
        userAgent: navigator.userAgent,
      });
      navigate('/home');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Hero — same token stack as home: green light / purple dark */}
      <div className="relative lg:w-[46%] min-h-[min(100dvh-3.5rem,520px)] lg:min-h-screen flex flex-col justify-between p-8 sm:p-10 lg:p-12 border-b-2 border-foreground/15 lg:border-b-0 lg:border-r-2 overflow-hidden bg-[hsl(var(--pp-hero-bg))] text-[hsl(var(--pp-hero-fg))]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, var(--brand-mint) 0%, transparent 45%),
              radial-gradient(circle at 80% 70%, var(--brand-purple) 0%, transparent 40%)`,
          }}
        />
        <ThemeToggle className="absolute top-4 right-4 z-10 border-[hsl(var(--pp-hero-fg))]/35 bg-black/15 text-[hsl(var(--pp-hero-fg))] hover:bg-black/25" />

        <div className="relative z-[1] flex-1 flex flex-col pt-8 lg:pt-4">
          <Link
            to="/"
            className="flex items-center gap-3 mb-8 w-fit group"
          >
            <PeerPulseLogoMark
              size={40}
              className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 drop-shadow-[3px_4px_0_rgba(0,0,0,0.15)]"
            />
            <span className="font-display font-extrabold text-xl tracking-tight uppercase">
              PeerPulse
            </span>
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-6 items-center flex-1">
            <div>
              <h1 className="font-display font-extrabold text-[clamp(1.75rem,4vw,2.85rem)] leading-[1.08] uppercase tracking-tight">
                <span className="inline-block rounded-full bg-brand-purple/90 backdrop-blur-sm px-4 py-1.5 text-brand-mint border-2 border-[hsl(var(--pp-hero-fg))]/35 shadow-sm">
                  Learn
                </span>
                <br />
                <span className="mt-2 inline-block">together — anywhere</span>
              </h1>
              <p className="mt-5 text-sm sm:text-base leading-relaxed text-[hsl(var(--pp-hero-fg))]/90 max-w-md">
                Book tutors, swap resources, and join discussions in one bold workspace built for peer
                learning.
              </p>
            </div>
            <div className="relative hidden sm:flex justify-center lg:justify-end items-center min-h-[160px]">
              <PeerPulseLogoMark className="w-[clamp(6.5rem,20vw,10rem)] aspect-square max-w-[160px] drop-shadow-[8px_10px_0_rgba(0,0,0,0.18)] dark:drop-shadow-[10px_12px_0_rgba(0,0,0,0.35)]" />
              <Starburst className="absolute -bottom-2 -right-2 lg:right-0 w-24 h-24 text-brand-green opacity-95 pointer-events-none drop-shadow-lg" />
            </div>
          </div>
        </div>

        <div className="relative z-[1] flex flex-wrap gap-3 mt-8 lg:mt-10">
          <Button
            type="button"
            className="bg-brand-ink text-brand-mint border-brand-ink hover:bg-brand-ink/90"
            asChild
          >
            <Link to="/register">Create account</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-2 border-[hsl(var(--pp-hero-fg))]/50 bg-transparent text-[hsl(var(--pp-hero-fg))] hover:bg-[hsl(var(--pp-hero-fg))]/10"
            asChild
          >
            <a href="#login-form">Sign in</a>
          </Button>
        </div>

        <Starburst className="absolute -bottom-8 -right-6 w-32 h-32 sm:w-40 sm:h-40 text-brand-green opacity-50 pointer-events-none sm:hidden" />
      </div>

      {/* Form — matches home dashboard contrast (mint/black by theme) */}
      <div
        id="login-form"
        className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 relative min-h-[min(100dvh-3.5rem,640px)] lg:min-h-screen bg-background"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />

        <div className="relative w-full max-w-sm">
          <div className="lg:hidden flex justify-end mb-4">
            <ThemeToggle />
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="font-display text-2xl font-bold tracking-tight uppercase">Welcome back</h2>
            <p className="text-muted-foreground mt-2 text-sm">Sign in to continue learning</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-5 gap-3 h-11 border-2"
            onClick={handleGoogleLogin}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@example.com"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                <span className="text-xs text-primary hover:underline cursor-pointer font-medium">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  className="pr-11"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-full p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-semibold">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
