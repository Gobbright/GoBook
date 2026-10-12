import { useState } from 'react';
import { SelectDropdown } from './SelectDropdown.jsx';

export function MasterDropdown({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  portal = false,
  disabled = false,
  required = false,
}) {
  const [isManual, setIsManual] = useState(false);

  const cleanOptions = [
    ...new Set(
      (Array.isArray(options) ? options : [])
        .map((o) => String(o?.name ?? o?.label ?? o ?? '').trim())
        .filter(Boolean)
    ),
  ];

  const dropdownOptions = value && !cleanOptions.includes(value) ? [value, ...cleanOptions] : cleanOptions;

  if (isManual || dropdownOptions.length === 0) {
    return (
      <div className="relative flex items-center w-full">
        <input
          className={`${buttonClassName || className || 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]'} ${dropdownOptions.length > 0 ? 'pr-20' : ''}`}
          value={value || ''}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onChange={(e) => onChange(e.target.value)}
        />
        {dropdownOptions.length > 0 && (
          <button
            type="button"
            title="Pick from dropdown"
            onClick={() => setIsManual(false)}
            className="absolute right-1.5 px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
          >
            Dropdown
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center w-full">
      <div className="flex-1 min-w-0">
        <SelectDropdown
          value={value || ''}
          onChange={(val) => {
            if (val === '__custom__') {
              setIsManual(true);
            } else {
              onChange(val);
            }
          }}
          options={[
            ...(value ? [{ value: '', label: '-- Clear --' }] : []),
            ...dropdownOptions.map((opt) => ({ value: opt, label: opt })),
            { value: '__custom__', label: '+ Type custom name...' },
          ]}
          placeholder={placeholder}
          buttonClassName={buttonClassName || className}
          portal={portal}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

