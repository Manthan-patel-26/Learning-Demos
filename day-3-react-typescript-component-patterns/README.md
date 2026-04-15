# Day 3: React TypeScript - Component Patterns

**Date:** February 13, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
A reusable form components library with `Input`, `Select`, and `Checkbox` components — all fully type-safe with validation, error handling, and generic value types.

---

## 📁 Project Structure
```
frontend/src/
├── components/
│   ├── Input.tsx     ← forwardRef, extends HTML attrs, size variants
│   ├── Select.tsx    ← Generic<T> component, typed options/onChange
│   └── Checkbox.tsx  ← ReactNode label, forwardRef
└── App.tsx           ← useForm hook, Registration demo
backend/src/
└── index.ts          ← POST /api/submit endpoint
```

---

## 🚀 How to Run

### Backend
```bash
cd backend && npm install && npm run dev
```

### Frontend
```bash
cd frontend && npm install && npm start
```

---

## 📖 Key Concepts

### 1. `interface` vs `type` for Props
```typescript
// ✅ Use interface for component props
interface ButtonProps { label: string; onClick: () => void; }

// ✅ Use type for unions, utilities
type ButtonVariant = "primary" | "secondary" | "ghost";
```

### 2. Extending HTML Attributes
```typescript
// Your component gets ALL HTML input attributes for free!
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string; // Your custom prop
  error?: string;
}
// Now users can pass: placeholder, disabled, autoFocus, maxLength, etc.
```

### 3. forwardRef Typing
```typescript
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...rest }, ref) => <input ref={ref} {...rest} />
);
Input.displayName = "Input"; // Always set this!
```

### 4. Generic Select Component
```typescript
// T can be string or number — TypeScript enforces consistency
function Select<T extends string | number>({ value, onChange }: SelectProps<T>) {}

// Usage — TypeScript infers T from options:
<Select<"admin" | "user"> options={roleOpts} onChange={(val) => {}} />
```

### 5. React.FC vs function — Why we avoid React.FC
```typescript
// ❌ React.FC — deprecated pattern, implicit children, can't use generics
const Button: React.FC<Props> = ({ label }) => <button>{label}</button>;

// ✅ Regular function — explicit, works with generics, no hidden children
function Button({ label }: Props) { return <button>{label}</button>; }
```

---

## ⚠️ Gotchas

| Problem | Wrong | Right |
|---------|-------|-------|
| useEffect deps | `useEffect(() => fetch(), [])` — missing deps | Add all deps or use ESLint plugin |
| Stale closure | `setInterval(() => console.log(count), 1000)` | Use `useRef` or functional update |
| Children type | `children: ReactElement` | `children: React.ReactNode` |
| onChange number | `onChange={(e) => setValue(e.target.value)}` | Parse: `Number(e.target.value)` |
