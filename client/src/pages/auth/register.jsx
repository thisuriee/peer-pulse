import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, BookOpen, Users, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PeerPulseLogoMark } from '@/components/peer-pulse-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Enter a valid email address'),
    role: z.enum(['student', 'tutor']),
    password: z.string().min(6, 'Password must be at least 6 characters').max(255),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const features = [
  {
    icon: BookOpen,
    title: 'Learn Together',
    desc: 'Access peer-reviewed study materials and collaborative notes',
  },
  {
    icon: Users,
    title: 'Find Your Peers',
    desc: 'Connect with tutors and learners who share your goals',
  },
  {
    icon: Star,
    title: 'Earn Recognition',
    desc: 'Build reputation through quality contributions and reviews',
  },
  {
    icon: Clock,
    title: 'Study on Demand',
    desc: 'Book sessions with expert tutors whenever you need help',
  },
];

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

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student' },
  });

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setValue('role', role, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', data);
      toast({
        title: 'Account created!',
        description: 'Welcome to PeerPulse. Please sign in to continue.',
      });
      navigate('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/auth/google`;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left — same hero system as login/home; no bottom tiles */}
      <div className="relative lg:w-[46%] min-h-[min(100dvh-3.5rem,560px)] lg:min-h-screen flex flex-col p-8 sm:p-10 lg:p-12 border-b-2 border-foreground/15 lg:border-b-0 lg:border-r-2 overflow-hidden bg-[hsl(var(--pp-hero-bg))] text-[hsl(var(--pp-hero-fg))]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `radial-gradient(circle at 0% 100%, var(--brand-purple) 0%, transparent 50%)`,
          }}
        />
        <ThemeToggle className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 border-[hsl(var(--pp-hero-fg))]/35 bg-black/15 text-[hsl(var(--pp-hero-fg))] hover:bg-black/25" />

        <div className="relative z-[1] flex-1 flex flex-col min-h-0">
          <Link to="/" className="flex items-center gap-3 mb-8 w-fit group">
            <PeerPulseLogoMark
              size={40}
              className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 drop-shadow-[3px_4px_0_rgba(0,0,0,0.15)]"
            />
            <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight uppercase">
              PeerPulse
            </span>
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-6 items-start flex-1">
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-[clamp(1.85rem,4.5vw,2.85rem)] leading-[1.05] uppercase tracking-tight">
                <span className="inline-block rounded-full bg-brand-purple/90 backdrop-blur-sm px-4 py-2 text-brand-mint border-2 border-[hsl(var(--pp-hero-fg))]/35 shadow-sm">
                  Join
                </span>
                <br />
                <span className="mt-3 inline-block">the study collective</span>
              </h1>
              <p className="mt-5 text-sm sm:text-base leading-relaxed text-[hsl(var(--pp-hero-fg))]/90 max-w-md">
                Thousands of students and tutors — one loud, friendly platform for collaborative
                learning.
              </p>

              <div className="mt-8 space-y-4 sm:space-y-5 max-w-lg">
                {features.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--pp-hero-fg))]/12 border-2 border-[hsl(var(--pp-hero-fg))]/25 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[hsl(var(--pp-hero-fg))]" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide">
                        {title}
                      </p>
                      <p className="text-xs sm:text-sm text-[hsl(var(--pp-hero-fg))]/85 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden sm:flex justify-center lg:justify-end items-center min-h-[140px] lg:min-h-[200px]">
              <PeerPulseLogoMark className="w-[clamp(6rem,18vw,9.5rem)] aspect-square max-w-[152px] drop-shadow-[8px_10px_0_rgba(0,0,0,0.18)] dark:drop-shadow-[10px_12px_0_rgba(0,0,0,0.35)]" />
              <Starburst className="absolute -bottom-1 -right-1 lg:right-2 w-20 h-20 sm:w-24 sm:h-24 text-brand-green opacity-95 pointer-events-none drop-shadow-lg" />
            </div>
          </div>

          <blockquote className="relative z-[1] mt-8 lg:mt-10 pt-6 border-t border-[hsl(var(--pp-hero-fg))]/25">
            <p className="text-sm text-[hsl(var(--pp-hero-fg))]/90 italic leading-relaxed max-w-lg">
              &ldquo;PeerPulse helped me go from struggling to top of my class in one semester.&rdquo;
            </p>
            <footer className="mt-2 text-xs font-semibold text-[hsl(var(--pp-hero-fg))]/75">
              — Amara K., Computer Science
            </footer>
          </blockquote>
        </div>

        <Starburst className="absolute -bottom-10 -right-8 w-36 h-36 text-brand-green opacity-40 pointer-events-none sm:hidden" />
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto relative min-h-[min(100dvh-3.5rem,640px)] lg:min-h-screen bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_80%_0%,hsl(var(--primary)/0.1),transparent)] pointer-events-none" />

        <div className="relative w-full max-w-md">
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2 group">
              <PeerPulseLogoMark
                size={36}
                className="shrink-0 drop-shadow-[2px_3px_0_rgba(0,0,0,0.1)]"
              />
              <span className="font-display font-extrabold text-lg uppercase">PeerPulse</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight uppercase">
              Create your account
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-6 gap-3 h-11 border-2"
            onClick={handleGoogleSignup}
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

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                or sign up with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                placeholder="Alex Johnson"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

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
              <Label>I want to join as</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('student')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm transition-colors cursor-pointer ${
                    selectedRole === 'student'
                      ? 'border-brand-green bg-brand-green/10 text-foreground dark:border-brand-green dark:bg-brand-green/15'
                      : 'border-border hover:border-primary/40 hover:bg-accent'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="font-semibold">Student</span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">
                    Learn from peers & tutors
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('tutor')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm transition-colors cursor-pointer ${
                    selectedRole === 'tutor'
                      ? 'border-brand-green bg-brand-green/10 text-foreground dark:border-brand-green dark:bg-brand-green/15'
                      : 'border-border hover:border-primary/40 hover:bg-accent'
                  }`}
                >
                  <Star className="w-5 h-5" />
                  <span className="font-semibold">Tutor</span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">
                    Share knowledge & earn
                  </span>
                </button>
              </div>
              {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
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

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  className="pr-11"
                  {...register('confirmPassword')}
                  aria-invalid={!!errors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-full p-1"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 mt-2 bg-brand-green text-brand-ink border-brand-green hover:bg-brand-green/90 dark:text-brand-ink"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
            By creating an account you agree to our{' '}
            <span className="underline cursor-pointer hover:text-foreground">Terms of Service</span>{' '}
            and{' '}
            <span className="underline cursor-pointer hover:text-foreground">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
