# Day 23: Advanced React Patterns — Forms

**Date:** March 13, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Multi-step registration form: dynamic field arrays (skills), conditional validation (company required when employed), Zod schema validation, progress saved to localStorage, and accessibility-friendly error display.

## 🚀 How to Run
```bash
cd frontend && npm install && npm start   # port 3000
cd backend && npm install && npm run dev  # port 3001 (optional)
```

## 📖 React Hook Form vs Controlled Forms

| Feature | useState (controlled) | react-hook-form (uncontrolled) |
|---------|----------------------|--------------------------------|
| Re-renders | Every keystroke | Only on validation/submit |
| Code | Verbose (state + handler) | `{...register("field")}` |
| Validation | Custom logic | Schema-based (Zod) |
| Performance | Slow for large forms | Fast (native DOM) |
| Dynamic fields | Complex | `useFieldArray` built-in |

## 📖 Key Concepts

### register() — Zero boilerplate
```typescript
// ❌ Controlled: verbose
const [email, setEmail] = useState("");
<input value={email} onChange={e => setEmail(e.target.value)} />

// ✅ React Hook Form: one line
const { register } = useForm();
<input {...register("email")} />
// register returns: { name, ref, onChange, onBlur }
```

### Zod as the Schema Source of Truth
```typescript
const schema = z.object({
  email: z.string().email(),
  age: z.coerce.number().min(18),
});

type FormData = z.infer<typeof schema>; // ← TypeScript type from schema!

const { register } = useForm<FormData>({
  resolver: zodResolver(schema), // ← validation from schema!
});
// One schema = TypeScript types + runtime validation
```

### Dynamic Field Arrays
```typescript
const { fields, append, remove } = useFieldArray({ control, name: "skills" });

// Render dynamic fields
{fields.map((field, i) => (
  <input key={field.id} {...register(`skills.${i}.name`)} />
))}

// Add / remove
<button onClick={() => append({ name: "" })}>Add</button>
<button onClick={() => remove(i)}>Remove</button>
```

### FormProvider (avoid prop drilling)
```typescript
// Root component
const methods = useForm<FormData>();
<FormProvider {...methods}>
  <Step1 />   ← Step components can access form methods without props
  <Step2 />
</FormProvider>

// Inside Step1 — no need to pass methods as props!
const { register, formState } = useFormContext<FormData>();
```

### Validation Timing Modes
```typescript
// onChange: validates every keystroke (aggressive)
// onBlur: validates when user leaves the field (recommended)
// onSubmit: validates only on submit (lazy)
// onTouched: validates after first blur, then on change

useForm({ mode: "onBlur" }); // Best UX for most forms
```

## ⚠️ Gotchas

| Problem | Detail |
|---------|--------|
| `register` on native elements | Works for input, select, textarea. For custom components use `Controller` |
| Dynamic key for array fields | Always use `field.id` from `useFieldArray`, NOT the array index |
| Conditional fields | Use `watch("status")` to conditionally render — RHF tracks watched values |
| `setValue` vs `reset` | `setValue` updates one field, `reset` replaces all values and clears errors |
