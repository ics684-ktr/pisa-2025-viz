//define ValueRange
export type ValueRange = {
    min: string;
    max: string;
  };
  
// for data passing between this file and App.tsx
  type Props = {
    range: ValueRange;
    onChange: (range: ValueRange) => void;
    invalid: boolean;
  };
  
  export default function ValueFilter({
    range,
    onChange,
    invalid,
  }: Props) {
    return (
      <fieldset className="value-filter">
        <legend>Filter AI use index</legend>
  
        <div className="filter-controls">
          <label>
            Minimum
            <input
              type="number"
              step="0.01"
              placeholder="No minimum"
              value={range.min}
              aria-invalid={invalid}
              aria-describedby={invalid ? "filter-error" : undefined}
              onChange={(event) =>
                onChange({ ...range, min: event.target.value })
              }
            />
          </label>
  
          <span className="filter-separator" aria-hidden="true">
            —
          </span>
  
          <label>
            Maximum
            <input
              type="number"
              step="0.01"
              placeholder="No maximum"
              value={range.max}
              aria-invalid={invalid}
              aria-describedby={invalid ? "filter-error" : undefined}
              onChange={(event) =>
                onChange({ ...range, max: event.target.value })
              }
            />
          </label>
  
          <button
            type="button"
            className="filter-reset"
            onClick={() => onChange({ min: "", max: "" })}
          >
            Reset
          </button>
        </div>
  
        {invalid && (
          <p id="filter-error" role="alert">
            Minimum must be less than or equal to maximum.
          </p>
        )}
      </fieldset>
    );
  }