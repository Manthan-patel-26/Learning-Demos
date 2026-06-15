# Day 34: Advanced React State Patterns — XState

**Date:** March 30, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Multi-step checkout state machine with XState v5: cart → shipping → payment → confirming → confirmed/paymentError. Guards prevent invalid transitions. Retry logic with max attempts. No impossible states.

## 🚀 How to Run
```bash
cd frontend && npm install && npm start   # port 3000
cd backend  && npm install && npm run dev # port 3001 (optional payment API)
```

NOTE: There might be some node_modules issue, please ignore those in terminal and close it from browser 

## 📖 State Machine vs Boolean Flags

### The Problem with Boolean Flags
```typescript
// ❌ Impossible states: loading + error + success can all be true!
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError]   = useState(false);
const [isSuccess, setIsSuccess] = useState(false);

// This can happen accidentally:
setIsLoading(true);
setIsError(true);   // ← isLoading AND isError both true = impossible state!
```

### The State Machine Solution
```typescript
// ✅ Always in exactly ONE state — impossible states are impossible!
const machine = createMachine({
  initial: "idle",
  states: {
    idle:    { on: { SUBMIT: "loading" } },
    loading: { on: { SUCCESS: "success", FAILURE: "error" } },
    success: { type: "final" },
    error:   { on: { RETRY: "loading" } },
  }
});
// Can never be in "loading" AND "error" simultaneously
```

## 📖 XState Core Concepts

### Context (machine's data)
```typescript
context: { cartItems: [], shipping: {}, errorMessage: null, retryCount: 0 }
// Updated with assign() — Immer-like immutable updates
actions: assign(({ context, event }) => ({
  retryCount: context.retryCount + 1,
  errorMessage: event.error,
}))
```

### Guards (conditional transitions)
```typescript
on: {
  NEXT: {
    target: "payment",
    guard: ({ context }) => !!context.shipping.name && !!context.shipping.address,
    // NEXT event is IGNORED if guard returns false
  }
}
```

### Entry/Exit Actions
```typescript
states: {
  confirming: {
    entry: assign({ errorMessage: null }), // Run when entering this state
    exit: () => console.log("Leaving confirming state"),
  }
}
```

## ⚠️ When to Use State Machines

✅ **Use when:**
- Multi-step wizards (checkout, onboarding)
- Complex async flows with multiple error states
- UI that has many interdependent boolean flags
- You need to prevent impossible states

❌ **Don't over-engineer:**
- Simple toggle: `useState(false)` is fine
- Single async operation: `useAsync` hook is enough
- Form state: React Hook Form handles it better
