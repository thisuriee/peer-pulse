import { Clock, CheckCircle, Award, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Backend stores statuses as lowercase strings.
// "accepted" is included here as it is a valid intermediate status
// between pending and confirmed (booking accepted, calendar not yet synced).
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle,
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800',
  },
  completed: {
    label: 'Completed',
    icon: Award,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  },
  declined: {
    label: 'Declined',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700',
  },
};

/**
 * Pill badge for booking status.
 * @param {Object} props
 * @param {'pending'|'accepted'|'confirmed'|'completed'|'cancelled'|'declined'} props.status
 * @param {string} [props.className] - Additional classes
 */
export default function BookingStatusBadge({ status, className }) {
  // Normalise: backend values are lowercase, but guard against uppercase variants
  const key = status?.toLowerCase();
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5',
        'text-xs font-semibold rounded-full border',
        config.className,
        className,
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {config.label}
    </span>
  );
}
