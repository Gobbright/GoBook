const variantClasses = {
  primary: 'text-white bg-blue-600 border-blue-600',
  ghost: 'text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800 border-[#dbe4ef] dark:border-slate-700',
};

export function Button({ children, variant = 'primary', ...props }) {
  return (
    <button
      className={`cursor-pointer border rounded-md px-3.5 py-2.5 ${variantClasses[variant] ?? variantClasses.primary}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
