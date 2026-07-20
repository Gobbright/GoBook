import { Badge } from '../../components/ui/Badge.jsx';
import { Card } from '../../components/ui/Card.jsx';

export function RecentTransactions({ transactions }) {
  return (
    <Card>
      <h2 className="m-0 mb-4 text-base font-semibold">Recent Transactions</h2>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td className="text-center py-8 text-[#536173] text-[13px]" colSpan={5}>
                No recent transactions yet.
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => (
              <tr key={transaction.invoice}>
                <td className="border-t border-[#edf2f7] px-2 py-3">{transaction.invoice}</td>
                <td className="border-t border-[#edf2f7] px-2 py-3">{transaction.customer}</td>
                <td className="border-t border-[#edf2f7] px-2 py-3">{transaction.amount}</td>
                <td className="border-t border-[#edf2f7] px-2 py-3">
                  <Badge tone={transaction.status === 'Paid' ? 'success' : 'warning'}>{transaction.status}</Badge>
                </td>
                <td className="border-t border-[#edf2f7] px-2 py-3">{transaction.date}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </Card>
  );
}
