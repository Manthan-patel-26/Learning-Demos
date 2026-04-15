/**
 * ============================================================
 * DAY 3: Reusable Form Components Library Demo
 * ============================================================
 * Uses all 3 form components: Input, Select, Checkbox
 * Demonstrates: useState typing, form validation, custom hooks
 */

import React, { useState, useCallback } from "react";
import Input from "./components/Input";
import Select, { SelectOption } from "./components/Select";
import Checkbox from "./components/Checkbox";

// ─── FORM STATE TYPE ──────────────────────────────────────
// Define the shape of your form data FIRST.
// All validation and onChange handlers derive from this.
type RegistrationForm = {
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user" | "guest" | "";
  experienceYears: number | "";
  agreeToTerms: boolean;
  subscribeNewsletter: boolean;
};

// ─── VALIDATION TYPE ──────────────────────────────────────
// Partial because not every field needs an error
type FormErrors = Partial<Record<keyof RegistrationForm, string>>;

// ─── CUSTOM HOOK: useForm ─────────────────────────────────
// Extract form logic into a reusable custom hook.
// Generic T makes this work for ANY form shape.
function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  // useCallback memoizes the function so it doesn't recreate on every render
  // Important for performance when passing as props to child components
  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const setError = useCallback(<K extends keyof T>(key: K, message: string) => {
    setErrors((prev) => ({ ...prev, [key]: message }));
  }, []);

  const markTouched = useCallback(<K extends keyof T>(key: K) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, setValue, setError, markTouched, reset };
}

// ─── SELECT OPTIONS ───────────────────────────────────────
// Typed options - TypeScript ensures value matches the role union type
const roleOptions: SelectOption<"admin" | "user" | "guest">[] = [
  { value: "admin", label: "Administrator" },
  { value: "user", label: "Regular User" },
  { value: "guest", label: "Guest" },
];

const experienceOptions: SelectOption<number>[] = [
  { value: 0, label: "< 1 year" },
  { value: 1, label: "1-2 years" },
  { value: 3, label: "3-5 years" },
  { value: 5, label: "5+ years" },
];

// ─── VALIDATION ───────────────────────────────────────────
function validateForm(values: RegistrationForm): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim()) errors.firstName = "First name is required";
  else if (values.firstName.length < 2)
    errors.firstName = "Must be at least 2 characters";

  if (!values.lastName.trim()) errors.lastName = "Last name is required";

  if (!values.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!values.role) errors.role = "Please select a role";
  if (values.experienceYears === "")
    errors.experienceYears = "Please select experience level";
  if (!values.agreeToTerms) errors.agreeToTerms = "You must agree to the terms";

  return errors;
}

// ─── MAIN APP ──────────────────────────────────────────────
export default function App() {
  const { values, errors, setValue, setError, reset } =
    useForm<RegistrationForm>({
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      experienceYears: "",
      agreeToTerms: false,
      subscribeNewsletter: false,
    });

  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate all fields
    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      // Set all errors at once
      Object.entries(validationErrors).forEach(([key, message]) => {
        if (message) setError(key as keyof RegistrationForm, message);
      });
      return;
    }

    setSubmitStatus("loading");
    try {
      const res = await fetch("http://localhost:3001/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      setSubmitMessage(data.message);
      setSubmitStatus("success");
      reset();
    } catch {
      setSubmitMessage("Backend not running. Form data is valid though!");
      setSubmitStatus("error");
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: 16,
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#f7fafc",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0, color: "#2d3748" }}>
          📝 Day 3: Form Components Library
        </h1>
        <p style={{ color: "#718096", marginBottom: 24 }}>
          Type-safe reusable form components with validation — Input, Select,
          Checkbox
        </p>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 18, color: "#4a5568" }}>
            Registration Form
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* Two inputs side by side - demonstrates grid layout */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <Input
                label="First Name"
                value={values.firstName}
                onChange={(e) => setValue("firstName", e.target.value)}
                error={errors.firstName}
                placeholder="Alice"
                required
                size="md"
              />
              <Input
                label="Last Name"
                value={values.lastName}
                onChange={(e) => setValue("lastName", e.target.value)}
                error={errors.lastName}
                placeholder="Smith"
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Input
                label="Email Address"
                type="email"
                value={values.email}
                onChange={(e) => setValue("email", e.target.value)}
                error={errors.email}
                placeholder="alice@example.com"
                helperText="We'll never share your email"
                required
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Select<"admin" | "user" | "guest"> - generic Select with string union */}
              <Select
                label="Role"
                options={roleOptions}
                value={values.role}
                onChange={(val) => setValue("role", val)}
                error={errors.role}
                placeholder="Select a role..."
                required
              />
              {/* Select<number> - generic Select with number values */}
              <Select
                label="Years of Experience"
                options={experienceOptions}
                value={values.experienceYears}
                onChange={(val) => setValue("experienceYears", val)}
                error={errors.experienceYears}
                placeholder="Select..."
                required
              />
            </div>

            <div
              style={{
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <Checkbox
                label="I agree to the Terms of Service and Privacy Policy"
                checked={values.agreeToTerms}
                onChange={(e) => setValue("agreeToTerms", e.target.checked)}
                error={errors.agreeToTerms}
                required
              />
              <Checkbox
                label="Subscribe to newsletter"
                description="Get weekly updates about new features and tips"
                checked={values.subscribeNewsletter}
                onChange={(e) =>
                  setValue("subscribeNewsletter", e.target.checked)
                }
              />
            </div>

            <button
              type="submit"
              disabled={submitStatus === "loading"}
              style={{
                width: "100%",
                padding: "10px 20px",
                background: submitStatus === "loading" ? "#90cdf4" : "#4299e1",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {submitStatus === "loading" ? "Submitting..." : "Create Account"}
            </button>

            {submitStatus !== "idle" && submitMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 6,
                  background:
                    submitStatus === "success" ? "#c6f6d5" : "#fed7d7",
                  color: submitStatus === "success" ? "#276749" : "#c53030",
                }}
              >
                {submitStatus === "success" ? "✅" : "⚠"} {submitMessage}
              </div>
            )}
          </form>
        </div>

        <div style={{ ...cardStyle, background: "#fffbeb", fontSize: 13 }}>
          <h3 style={{ marginTop: 0 }}>🎓 Concepts Demonstrated</h3>
          <ul style={{ paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
            <li>
              <strong>forwardRef + TypeScript:</strong> Input & Checkbox use{" "}
              <code>React.forwardRef&lt;HTMLInputElement, Props&gt;</code>
            </li>
            <li>
              <strong>Generic Components:</strong>{" "}
              <code>Select&lt;T extends string | number&gt;</code> — works with
              any value type
            </li>
            <li>
              <strong>Interface extends HTML attrs:</strong>{" "}
              <code>
                InputProps extends
                React.InputHTMLAttributes&lt;HTMLInputElement&gt;
              </code>
            </li>
            <li>
              <strong>Custom Hook:</strong> <code>useForm&lt;T&gt;</code> —
              generic, reusable across any form
            </li>
            <li>
              <strong>ReactNode for children/labels:</strong> Checkbox label
              accepts JSX or plain string
            </li>
            <li>
              <strong>Partial&lt;Record&lt;K, V&gt;&gt;:</strong> FormErrors
              type — optional error for each field key
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
