import { Pencil, Trash2 } from 'lucide-react';

export function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1">
      {onEdit && (
        <button type="button" title="Edit" onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer">
          <Pencil size={13} />
        </button>
      )}
      {onDelete && (
        <button type="button" title="Delete" onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
