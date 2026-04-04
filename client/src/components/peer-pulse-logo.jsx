import { cn } from '@/lib/utils';

/**
 * Layered mark inspired by dimensional “ribbon” logos (e.g. Udemy-style depth).
 * Optional `size` sets both dimensions; omit `size` and use `className` (e.g. w-*) for fluid sizing.
 */
export function PeerPulseLogoMark({ size, className }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={cn(!size && 'h-auto', className)}
      aria-hidden="true"
    >
      <rect
        x="11"
        y="13"
        width="20"
        height="22"
        rx="5"
        fill="#3da85a"
        transform="translate(5 5)"
      />
      <rect
        x="9"
        y="11"
        width="20"
        height="22"
        rx="5"
        fill="#855BE2"
        transform="translate(2.5 2.5)"
      />
      <rect
        x="7"
        y="9"
        width="20"
        height="22"
        rx="5"
        fill="#F5FFFB"
        stroke="#0a0a0a"
        strokeWidth="1.25"
        className="dark:stroke-white/35"
      />
      <path
        d="M14 15.5v11M14 21.5h5.2a3.2 3.2 0 1 0 0-6.4H14"
        stroke="#0a0a0a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
