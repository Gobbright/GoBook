import { Card } from '../../components/ui/Card.jsx';

export function DashboardMetrics({ metrics, activeHash = '' }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-7">
      {metrics.map((metric) => (
        <Card
          className={`min-h-37.5 ${metric.hash && activeHash === metric.hash ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
          key={metric.label}
        >
          <span>{metric.label}</span>
          <strong className="block my-4 text-2xl">{metric.value}</strong>
          <small>{metric.trend}</small>
        </Card>
      ))}
    </section>
  );
}
