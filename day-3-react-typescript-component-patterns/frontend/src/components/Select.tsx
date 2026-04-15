/**
 * ============================================================
 * TYPE-SAFE SELECT COMPONENT - Generics in Action
 * ============================================================
 * Demonstrates:
 * - Generic component with value type constraint
 * - Discriminated union for option types
 * - Children prop typing (ReactNode vs ReactElement)
 */

import React from "react";

// ─── OPTION TYPE ──────────────────────────────────────────
// Generic: the VALUE can be any string or number.
// The LABEL is always a string.
// This lets Select work with { value: "admin", label: "Admin" }
// OR { value: 42, label: "Option 42" }
export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

// ─── SELECT PROPS ─────────────────────────────────────────
// The generic T propagates through: value and onChange use the same T.
// This ensures you can't pass value="admin" to a Select<number>.
interface SelectProps<T extends string | number> extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
> {
  label: string;
  options: SelectOption<T>[];
  value: T | ""; // Current value
  onChange: (value: T) => void; // Typed callback - no event object needed
  error?: string;
  placeholder?: string; // "Select an option..." text
}

// ─── GENERIC COMPONENT ────────────────────────────────────
// Generic components can't use arrow functions with the JSX-friendly
// syntax when in .tsx files (TypeScript confuses <T> with JSX tag).
// Solution: add a constraint like <T extends string | number> or use function syntax.
function Select<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
  placeholder,
  required,
  disabled,
  id,
  ...rest
}: SelectProps<T>) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, "-")}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawValue = e.target.value;
    // We need to find the original typed value from our options array
    // because select values are always strings in the DOM
    const option = options.find((o) => String(o.value) === rawValue);
    if (option) {
      onChange(option.value); // Call with the correctly typed value
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        htmlFor={selectId}
        style={{ fontSize: 13, fontWeight: 600, color: "#4a5568" }}
      >
        {label}
        {required && <span style={{ color: "#e53e3e", marginLeft: 2 }}>*</span>}
      </label>

      <select
        id={selectId}
        value={String(value)} // DOM always needs string
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={!!error}
        style={{
          padding: "8px 12px",
          fontSize: 15,
          border: `1px solid ${error ? "#fc8181" : "#cbd5e0"}`,
          borderRadius: 6,
          background: disabled ? "#f7fafc" : "#fff",
          color: value === "" ? "#a0aec0" : "#2d3748",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        {...rest}
      >
        {/* Placeholder option - disabled so user can't select it again */}
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {/* Render all options */}
        {options.map((option) => (
          <option
            key={String(option.value)}
            value={String(option.value)}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <span role="alert" style={{ fontSize: 12, color: "#e53e3e" }}>
          ⚠ {error}
        </span>
      )}
    </div>
  );
}

export default Select;
