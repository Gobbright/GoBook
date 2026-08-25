import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';

const DEFAULT_ACTIONS = [
  { label: 'Create Invoice', route: '/billing/invoice/new' },
  { label: 'Create Quotation', route: '/billing/quotation/new' },
  { label: 'Add Customer', route: '#customers' },
  { label: 'Add Product', route: '#products' },
  { label: 'Record Payment', route: '/billing/invoice' },
  { label: 'Stock In', route: '#stock-in' },
  { label: 'Stock Out', route: '#stock-out' },
];

export function QuickActions({ actions = DEFAULT_ACTIONS }) {
  return (
    <Card className="mt-5">
      <h2 className="m-0 mb-4 text-base font-semibold">Quick Actions</h2>
      <div className="flex flex-wrap gap-4">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            onClick={() => window.location.assign(action.route)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
