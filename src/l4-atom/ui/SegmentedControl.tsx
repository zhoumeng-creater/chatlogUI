import { getSegmentedItemClassName } from "./formControl";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  id?: string;
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-describedby"?: string;
}

export function SegmentedControl<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  "aria-describedby": ariaDescribedBy,
}: SegmentedControlProps<T>) {
  return (
    <div
      id={id}
      className="ui-segmented"
      role="group"
      aria-label={label}
      aria-describedby={ariaDescribedBy}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={getSegmentedItemClassName(option.value === value)}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
