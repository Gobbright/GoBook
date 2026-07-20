export const INPUT = 'w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-[13.5px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 transition-all duration-150';
export const ICON  = 'absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none';
export const LABEL = 'block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-2';

export const HEADING = 'text-slate-900 dark:text-white';
export const SUBTEXT = 'text-slate-500 dark:text-slate-400';
export const MUTED   = 'text-slate-500 dark:text-slate-400';
export const EYE_BUTTON = 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300';
export const CHECKBOX_TEXT = 'text-slate-500 dark:text-slate-400';

export const ERROR_BOX = 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25';
export const ERROR_TEXT = 'text-red-600 dark:text-red-400';
export const INFO_BOX = 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25';
export const INFO_TEXT = 'text-blue-600 dark:text-blue-400';
export const SUCCESS_BOX = 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25';
export const SUCCESS_TEXT = 'text-emerald-600 dark:text-emerald-400';
export const ICON_BOX_BLUE = 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25';
export const ICON_BOX_SUCCESS = 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25';
export const SECONDARY_BUTTON = 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700';
export const SECONDARY_BUTTON_TEXT = 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200';

export const BTN_PRIMARY = {
  background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)',
  boxShadow: '0 6px 24px -4px rgba(79,144,255,0.55)',
};

export function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" {...props}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
