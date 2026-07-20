import { Card } from '../../components/ui/Card.jsx';

export function AiInsights({ insights }) {
  return (
    <Card className="mt-5">
      <h2 className="m-0 mb-4 text-base font-semibold">AI Insights</h2>
      {insights.length === 0 ? (
        <p className="text-center py-2 text-[#536173] text-[13px] m-0">No insights yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.map((insight) => <span key={insight}>{insight}</span>)}
        </div>
      )}
    </Card>
  );
}
