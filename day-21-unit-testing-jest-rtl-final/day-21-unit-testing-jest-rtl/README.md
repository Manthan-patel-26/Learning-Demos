# Day 21: Unit Testing — Jest & React Testing Library

**Date:** March 11, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build

Comprehensive test suite for 5 complex components: form validation, async data fetching, user interactions, error states, and edge cases — with 90%+ meaningful coverage.

## 🚀 How to Run

```bash
cd backend && npm install && npm run dev
cd frontend && npm install

npm test                        # Interactive watch mode
npm test -- --coverage          # With coverage report
npm test -- --watchAll=false    # Run once (CI mode)
npm test -- --verbose           # Show all test names
```

After npm test with coverage: You can open below files in browser to view report
File 1: file:///home/darshan/Downloads/21-30/day-21-unit-testing-jest-rtl/frontend/coverage/lcov-report/components.tsx.html
File 2: file:///home/darshan/Downloads/21-30/day-21-unit-testing-jest-rtl/frontend/coverage/lcov-report/App.tsx.html

## 📁 Key Files

```
frontend/src/
├── components.tsx           ← 5 components: LoginForm, UserCard, AsyncDataList, Counter, SearchBar
├── __tests__/
│   └── components.test.tsx  ← 25+ tests covering all components
└── setupTests.ts            ← Imports jest-dom matchers
```

## 📖 Query Priority (use in this order)

```
1. getByRole()          → Best: matches accessible roles (button, heading, input)
2. getByLabelText()     → For form fields (matches <label>)
3. getByPlaceholderText() → For inputs with placeholder
4. getByText()          → For static text content
5. getByTestId()        → Last resort: use data-testid attribute
```

### Why prefer getByRole over getByTestId?

```typescript
// ❌ getByTestId — fragile, not accessible
<button data-testid="submit-btn">Sign In</button>
screen.getByTestId("submit-btn");

// ✅ getByRole — tests what user actually sees/interacts with
screen.getByRole("button", { name: /sign in/i });
// If the accessible name changes, the test tells you something broke for screen readers too!
```

## 📖 The Three Query Types

```typescript
// getBy*  — throws if not found (synchronous elements)
const button = screen.getByRole("button");

// findBy* — returns Promise, waits for element to appear (async rendering)
const item = await screen.findByText("Loaded data");

// queryBy* — returns null if not found (for asserting absence)
expect(screen.queryByText("Error")).not.toBeInTheDocument();
```

## 📖 Fake Timers for Debounce Testing

```typescript
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

// Without fake timers: test would wait 300ms (slow!)
// With fake timers: advance time instantly
fireEvent.change(input, { target: { value: "react" } });
act(() => {
  jest.advanceTimersByTime(300);
});
expect(mockOnSearch).toHaveBeenCalledWith("react");
```

## ⚠️ Common Testing Mistakes

| Mistake                               | Fix                                                |
| ------------------------------------- | -------------------------------------------------- |
| Testing implementation details        | Test what user sees/does, not internal state       |
| Not using `await` with `findBy*`      | Always `await screen.findBy*()` for async elements |
| Calling `mockFn.mockClear()` manually | Use `beforeEach(() => mockFn.mockClear())`         |
| Real timers in debounce tests         | Use `jest.useFakeTimers()`                         |
| `getBy*` for async elements           | Use `findBy*` or wrap in `waitFor()`               |
