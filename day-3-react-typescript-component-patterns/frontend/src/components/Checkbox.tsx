/**
 * ============================================================
 * TYPE-SAFE CHECKBOX COMPONENT
 * ============================================================
 * Demonstrates:
 * - Extending HTML element attributes
 * - Boolean prop patterns
 * - ReactNode vs ReactElement for children
 */

import React from "react";

// ReactNode: anything React can render (string, number, JSX, array, null, boolean)
// ReactElement: specifically a JSX element (<div>, <Component />)
// Use ReactNode for `children` - it's the most permissive and correct type

interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> {
  label: React.ReactNode; // ReactNode: can be string, JSX, or anything renderable
  error?: string;
  description?: string; // Optional secondary text
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, description, id, required, ...rest }, ref) => {
    const checkboxId = id ?? `checkbox-${Date.now()}`;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox" // Always "checkbox" - hardcoded!
            aria-invalid={!!error}
            style={{
              width: 16,
              height: 16,
              marginTop: 2,
              cursor: rest.disabled ? "not-allowed" : "pointer",
              accentColor: "#4299e1", // Modern CSS - colors the checkbox
            }}
            {...rest}
          />
          <div>
            <label
              htmlFor={checkboxId}
              style={{ fontSize: 15, color: "#2d3748", cursor: "pointer" }}
            >
              {label}
              {required && (
                <span style={{ color: "#e53e3e", marginLeft: 2 }}>*</span>
              )}
            </label>
            {description && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#718096" }}>
                {description}
              </p>
            )}
          </div>
        </div>

        {error && (
          <span
            role="alert"
            style={{ fontSize: 12, color: "#e53e3e", marginLeft: 24 }}
          >
            ⚠ {error}
          </span>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
export default Checkbox;
