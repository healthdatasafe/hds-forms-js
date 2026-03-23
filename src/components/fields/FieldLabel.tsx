interface InfoIconProps {
  description: string;
}

/**
 * Small (i) icon with native tooltip (title attribute).
 * Works on desktop (hover) and mobile (long-press).
 */
export function InfoIcon ({ description }: InfoIconProps) {
  return (
    <span
      title={description}
      className='ml-1 inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500 dark:bg-gray-600 dark:text-gray-400'
    >
      i
    </span>
  );
}
