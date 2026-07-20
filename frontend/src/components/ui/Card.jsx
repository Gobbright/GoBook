export function Card({ children, className = '' }) {
  return (
    <section className={`bg-white dark:bg-slate-900 border border-[#dfe7f1] dark:border-slate-800 rounded-lg p-5 ${className}`}>
      {children}
    </section>
  );
}
