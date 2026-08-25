import { useMemo, useState } from 'react';
import { ArrowRightLeft, CalendarDays, Search, UserCircle2 } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { Badge, Card, Field, PageHeader, PrimaryButton, TextInput, money, roomChoices } from './FrontDeskShared.jsx';

const guest = {
  name: 'No guest selected',
  id: '-',
  room: '-',
  roomType: '-',
  floor: '-',
  checkOut: '-',
};

export function RoomChangePage() {
  const [search, setSearch] = useState('');
  const [newRoom, setNewRoom] = useState(roomChoices[0]?.value || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const selectedRoom = useMemo(() => roomChoices.find((room) => room.value === newRoom) || null, [newRoom]);

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PageHeader title="Room Change" subtitle="Move guest to another room and update the stay folio." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_0.65fr_1fr_1fr]">
        <Card className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Select Guest</h2>
          <div className="mt-4">
            <TextInput icon={Search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search guest or room no." />
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-blue-700">
                <UserCircle2 size={26} />
              </span>
              <div>
                <div className="text-[15px] font-bold text-slate-950">{guest.name}</div>
                <div className="text-[12px] text-slate-500">{guest.id}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
              <div><span className="text-slate-500">Room</span><div className="mt-1 font-bold text-slate-950">{guest.room}</div></div>
              <div><span className="text-slate-500">Type</span><div className="mt-1 font-bold text-slate-950">{guest.roomType}</div></div>
              <div><span className="text-slate-500">Floor</span><div className="mt-1 font-bold text-slate-950">{guest.floor}</div></div>
              <div><span className="text-slate-500">Check-out</span><div className="mt-1 font-bold text-slate-950">{guest.checkOut}</div></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Current Room</h2>
          <div className="mt-5 text-[34px] font-bold leading-none text-slate-950">{guest.room}</div>
          <div className="mt-2 text-[13px] font-semibold text-slate-700">{guest.roomType}</div>
          <div className="mt-5 grid gap-3 text-[12px]">
            <div><span className="text-slate-500">Floor</span><div className="mt-1 font-bold text-slate-950">{guest.floor}</div></div>
            <div><span className="text-slate-500">Status</span><div className="mt-1"><Badge>Occupied</Badge></div></div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-blue-700">New Room</h2>
          <div className="mt-4 space-y-4">
            <Field label="Select New Room">
              <SelectDropdown value={newRoom} onChange={setNewRoom} options={roomChoices} />
            </Field>
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <div><span className="text-slate-500">Floor</span><div className="mt-1 font-bold text-slate-950">{selectedRoom?.floor || '-'}</div></div>
              <div><span className="text-slate-500">Status</span><div className="mt-1">{selectedRoom ? <Badge>{selectedRoom.status}</Badge> : '-'}</div></div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="text-[12px] font-semibold text-blue-700">Rate Difference</div>
              <div className="mt-1 text-[18px] font-bold text-blue-900">+ {money(selectedRoom?.rateDiff || 0)} / Night</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Effective Date & Time</h2>
          <div className="mt-4 space-y-4">
            <Field label="Date" required>
              <TextInput icon={CalendarDays} value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
            <Field label="Time" required>
              <TextInput value={time} onChange={(event) => setTime(event.target.value)} />
            </Field>
            <Field label="Reason">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-24 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
              />
            </Field>
            <PrimaryButton className="w-full" onClick={() => setMessage(selectedRoom ? `${guest.name} moved from ${guest.room} to ${newRoom.split(' - ')[0]}.` : 'Select a guest and room before confirming.')}>
              <ArrowRightLeft size={15} />
              Confirm Room Change
            </PrimaryButton>
            {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">{message}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
