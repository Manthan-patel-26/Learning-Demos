/**
 * ============================================================
 * TYPE-SAFE INPUT COMPONENT
 * ============================================================
 * Demonstrates:
 * - Interface vs type for props
 * - Extending HTML element props (React.InputHTMLAttributes)
 * - forwardRef with proper TypeScript typing
 * - Controlled vs uncontrolled component patterns
 */

import React from "react";

// ─── INTERFACE vs TYPE for Props ──────────────────────────
// RULE: Use `interface` for component props (extensible, better error messages)
//       Use `type` for unions, intersections, utility types

/**
 * InputProps extends React's built-in input attributes.
 * This means ALL standard HTML input props (placeholder, disabled,
 * autoFocus, etc.) work automatically without you defining them!
 * 
 * We `Omit` the base 'size' because HTML's size is a number,
 * but we want 'sm' | 'md' | 'lg' for our design system.
 */
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;               // Required: every input needs a label for a11y
  error?: string;              // Optional: validation error message
  helperText?: string;         // Optional: hint text below the input
  size?: "sm" | "md" | "lg";  // Our custom size prop
  isLoading?: boolean;         // Show a loading spinner
}

// ─── forwardRef TYPING ────────────────────────────────────
// forwardRef lets parent components get a ref to the DOM input.
// The generic is: React.forwardRef<DOM_ELEMENT_TYPE, PROPS_TYPE>
// This is needed for form libraries, focus management, etc.

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      size = "md",
      isLoading = false,
      id,
      className: _className, // Accept but we control styling
      ...rest // Spread all remaining HTML input attributes (placeholder, type, etc.)
    },
    ref // The forwarded ref from the parent
  ) => {
    // Generate a unique ID if not provided (for label-input association)
    const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

    // Size-based styles
    const sizeStyles: Record<NonNullable<InputProps["size"]>, React.CSSProperties> = {
      sm: { fontSize: 13, padding: "4px 10px" },
      md: { fontSize: 15, padding: "8px 12px" },
      lg: { fontSize: 17, padding: "12px 16px" },
    };

    const inputStyle: React.CSSProperties = {
      ...sizeStyles[size],
      width: "100%",
      boxSizing: "border-box",
      border: `1px solid ${error ? "#fc8181" : "#cbd5e0"}`,
      borderRadius: 6,
      outline: "none",
      background: rest.disabled ? "#f7fafc" : "#fff",
      color: rest.disabled ? "#a0aec0" : "#2d3748",
      transition: "border-color 0.15s",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Label — always linked to input via htmlFor/id for accessibility */}
        <label
          htmlFor={inputId}
          style={{ fontSize: 13, fontWeight: 600, color: "#4a5568" }}
        >
          {label}
          {/* Show required indicator if `required` prop is passed */}
          {rest.required && <span style={{ color: "#e53e3e", marginLeft: 2 }}>*</span>}
        </label>

        <div style={{ position: "relative" }}>
          <input
            id={inputId}
            ref={ref}            // Forward the ref to the actual DOM element
            style={inputStyle}
            aria-invalid={!!error} // Accessibility: screen readers announce errors
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...rest}            // Spread type, placeholder, onChange, value, etc.
          />
          {/* Loading spinner overlay */}
          {isLoading && (
            <span style={{
              position: "absolute", right: 10, top: "50%",
              transform: "translateY(-50%)", fontSize: 14
            }}>⏳</span>
          )}
        </div>

        {/* Error message — role="alert" makes screen readers announce it */}
        {error && (
          <span
            id={`${inputId}-error`}
            role="alert"
            style={{ fontSize: 12, color: "#e53e3e" }}
          >
            ⚠ {error}
          </span>
        )}

        {/* Helper text — only show when no error */}
        {helperText && !error && (
          <span
            id={`${inputId}-helper`}
            style={{ fontSize: 12, color: "#718096" }}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

// displayName helps React DevTools show the component name properly
// Without this, forwardRef components show as "ForwardRef" in DevTools
Input.displayName = "Input";

export default Input;
