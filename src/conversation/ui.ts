/**
 * The class names the conversation components share: the library's tokens (`primary` scale, class-based `dark`,
 * css/tokens.css), large touch targets (44 px). A host restyles a component through its `className`.
 */
const base = 'inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50';

export const btn = {
  primary: `${base} bg-primary-600 text-white hover:bg-primary-700`,
  outline: `${base} border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700`,
  ghost: `${base} text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700`,
  link: 'inline-flex min-h-11 items-center text-sm font-medium text-primary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300'
};

export const card = 'rounded-lg border border-gray-200 bg-white p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
export const panel = 'rounded-md bg-gray-50 p-3 dark:bg-gray-800';
export const muted = 'text-sm text-gray-600 dark:text-gray-400';
export const small = 'text-xs text-gray-600 dark:text-gray-400';
export const bubbleIn = 'max-w-[82%] rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-3 py-2 text-sm leading-snug text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
export const bubbleOut = 'max-w-[82%] rounded-2xl rounded-tr-sm border border-primary-200 bg-primary-50 px-3 py-2 text-sm leading-snug text-gray-900 dark:border-primary-800 dark:bg-primary-950 dark:text-gray-100';

export const cx = (...c: Array<string | false | null | undefined>): string => c.filter(Boolean).join(' ');
