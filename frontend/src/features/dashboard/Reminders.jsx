import { Card } from '../../components/ui/Card.jsx';

export function Reminders({ reminders }) {
  return (
    <Card>
      <h2 className="m-0 mb-4 text-base font-semibold">Upcoming Reminders</h2>
      {reminders.length === 0 ? (
        <p className="text-center py-4 text-[#536173] text-[13px] m-0">No reminders right now.</p>
      ) : (
        <ul className="grid gap-3.5 m-0 p-0 list-none">
          {reminders.map((reminder) => (
            <li className="grid gap-1" key={reminder.title}>
              <strong>{reminder.title}</strong>
              <span className="text-[#536173] text-[13px]">{reminder.description}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
