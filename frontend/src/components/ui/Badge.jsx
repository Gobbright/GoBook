const toneClasses = {
  success: 'text-green-700 bg-green-100',
  warning: 'text-amber-700 bg-amber-100',
  neutral: 'text-gray-600 bg-gray-100',
};

export function Badge({ children, tone = 'neutral' }) {
  return (
    <span className={`inline-block rounded-md px-2 py-1 text-sm ${toneClasses[tone] ?? toneClasses.neutral}`}>
      {children}
    </span>
  );
}
