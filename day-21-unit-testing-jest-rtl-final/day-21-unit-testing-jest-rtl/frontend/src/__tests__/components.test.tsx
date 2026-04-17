/**
 * ============================================================
 * DAY 21: COMPREHENSIVE UNIT TEST SUITE
 * ============================================================
 * Covers all 5 components with 90%+ meaningful coverage.
 *
 * Run tests:  npm test
 * Coverage:   npm test -- --coverage
 * Watch mode: npm test -- --watch
 *
 * TESTING PHILOSOPHY:
 *  ✅ Test BEHAVIOR (what the user sees/does), not implementation
 *  ✅ Use accessible queries (getByRole, getByLabelText) over data-testid
 *  ✅ Test edge cases and error states
 *  ❌ Don't test internal state directly
 *  ❌ Don't test library code (React itself)
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import {
  LoginForm,
  UserCard,
  AsyncDataList,
  Counter,
  SearchBar,
  User,
} from "../components";

// ─── SETUP ────────────────────────────────────────────────
// userEvent.setup() creates a user-event instance.
// Prefer userEvent over fireEvent for realistic user simulation:
//   fireEvent.click() = raw DOM event (no focus, no pointer events)
//   userEvent.click() = full browser simulation (focus, hover, pointer)
const user = userEvent.setup();

// ─────────────────────────────────────────────────────────
// 1. LOGIN FORM TESTS
// ─────────────────────────────────────────────────────────
describe("LoginForm", () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear(); // Reset call history before each test
  });

  // ── Happy Path ──────────────────────────────────────────
  it("renders email and password fields with submit button", () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // getByLabelText: finds input by its <label> text (better for a11y!)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    // getByRole: finds by ARIA role (most accessible query)
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("calls onSubmit with email and password when form is valid", async () => {
    mockOnSubmit.mockResolvedValue(undefined); // Simulate successful login
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Simulate a real user typing (triggers onChange, keyDown, keyUp events)
    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: "alice@example.com",
      password: "password123",
    });
  });

  // ── Validation ──────────────────────────────────────────
  it("shows validation errors when submitting empty form", async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // role="alert" makes screen readers announce errors
    expect(screen.getByRole("alert", { name: /email/i })).toHaveTextContent(
      "Email is required",
    );
    expect(screen.getByRole("alert", { name: /password/i })).toHaveTextContent(
      "Password is required",
    );

    // onSubmit should NOT be called when validation fails
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("shows invalid email error for malformed email", async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByTestId("email-error")).toHaveTextContent(
      "Invalid email address",
    );
  });

  it("shows password length error for short password", async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "abc");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByTestId("password-error")).toHaveTextContent(
      "at least 6 characters",
    );
  });

  // ── Async / Loading states ──────────────────────────────
  it("shows loading state and disables button while submitting", async () => {
    // mockOnSubmit never resolves — stays in loading state
    mockOnSubmit.mockReturnValue(new Promise(() => {}));
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />);

    const submitButton = screen.getByRole("button", { name: /signing in/i });
    expect(submitButton).toBeDisabled();
  });

  it("shows error message when login fails", async () => {
    // Simulate server rejecting login
    mockOnSubmit.mockRejectedValue(new Error("Invalid credentials"));
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // waitFor: keep retrying assertion until it passes (or timeout)
    // Use for async state updates
    await waitFor(() => {
      expect(screen.getByTestId("submit-error")).toHaveTextContent(
        "Invalid credentials",
      );
    });
  });
});

// ─────────────────────────────────────────────────────────
// 2. USER CARD TESTS
// ─────────────────────────────────────────────────────────
describe("UserCard", () => {
  const activeUser: User = {
    id: "u1",
    name: "Alice Smith",
    email: "alice@example.com",
    role: "admin",
    isActive: true,
  };

  const inactiveUser: User = { ...activeUser, id: "u2", isActive: false };

  it("renders user name, email, and role", () => {
    render(<UserCard user={activeUser} />);

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    // Use getByTestId for custom attributes
    expect(screen.getByTestId("user-role")).toHaveTextContent("admin");
  });

  it("shows avatar fallback with first letter when no avatar provided", () => {
    render(<UserCard user={activeUser} />);
    // No avatar URL → fallback div shown
    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("A");
  });

  it("renders avatar image when avatar URL provided", () => {
    const userWithAvatar: User = {
      ...activeUser,
      avatar: "https://example.com/avatar.jpg",
    };
    render(<UserCard user={userWithAvatar} />);
    const img = screen.getByRole("img", { name: /alice smith's avatar/i });
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("shows inactive badge for inactive users", () => {
    render(<UserCard user={inactiveUser} />);
    expect(screen.getByTestId("inactive-badge")).toBeInTheDocument();
  });

  it("does NOT show inactive badge for active users", () => {
    render(<UserCard user={activeUser} />);
    expect(screen.queryByTestId("inactive-badge")).not.toBeInTheDocument();
    // queryBy: returns null instead of throwing when element not found
  });

  it("calls onEdit with user when Edit button clicked", async () => {
    const mockOnEdit = jest.fn();
    render(<UserCard user={activeUser} onEdit={mockOnEdit} />);

    await user.click(screen.getByTestId("edit-button"));
    expect(mockOnEdit).toHaveBeenCalledWith(activeUser);
  });

  it("calls onDeactivate with userId when Deactivate clicked", async () => {
    const mockDeactivate = jest.fn();
    render(<UserCard user={activeUser} onDeactivate={mockDeactivate} />);

    await user.click(screen.getByTestId("deactivate-button"));
    expect(mockDeactivate).toHaveBeenCalledWith("u1");
  });

  it("does not show Deactivate button for inactive user", () => {
    const mockDeactivate = jest.fn();
    render(<UserCard user={inactiveUser} onDeactivate={mockDeactivate} />);
    expect(screen.queryByTestId("deactivate-button")).not.toBeInTheDocument();
  });

  it("hides action buttons when showActions is false", () => {
    render(
      <UserCard user={activeUser} onEdit={jest.fn()} showActions={false} />,
    );
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────
// 3. ASYNC DATA LIST TESTS
// ─────────────────────────────────────────────────────────
describe("AsyncDataList", () => {
  // ── findBy* queries: return a promise, use for async rendering ────
  // getBy: throws immediately if not found (for synchronous elements)
  // findBy: waits up to 1s for element to appear (for async rendering)
  // queryBy: returns null if not found (for asserting absence)

  it("shows loading spinner initially", () => {
    const fetchData = jest.fn().mockReturnValue(new Promise(() => {})); // Never resolves
    render(<AsyncDataList fetchData={fetchData} title="Items" />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders items after successful fetch", async () => {
    const fetchData = jest
      .fn()
      .mockResolvedValue(["React", "TypeScript", "Node.js"]);
    render(<AsyncDataList fetchData={fetchData} title="Technologies" />);

    // findAllByTestId: waits for all matching elements to appear
    const items = await screen.findAllByTestId("list-item");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("React");
    expect(items[1]).toHaveTextContent("TypeScript");
  });

  it("shows error message when fetch fails", async () => {
    const fetchData = jest.fn().mockRejectedValue(new Error("Network error"));
    render(<AsyncDataList fetchData={fetchData} title="Items" />);

    const errorMsg = await screen.findByTestId("error-message");
    expect(errorMsg).toHaveTextContent("Network error");
  });

  it("shows empty state when fetch returns empty array", async () => {
    const fetchData = jest.fn().mockResolvedValue([]);
    render(<AsyncDataList fetchData={fetchData} title="Items" />);

    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders the title correctly", async () => {
    const fetchData = jest.fn().mockResolvedValue(["item1"]);
    render(<AsyncDataList fetchData={fetchData} title="My List Title" />);
    expect(await screen.findByText("My List Title")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────
// 4. COUNTER TESTS
// ─────────────────────────────────────────────────────────
describe("Counter", () => {
  it("renders with default initial value of 0", () => {
    render(<Counter />);
    expect(screen.getByTestId("count-display")).toHaveTextContent("0");
  });

  it("renders with custom initial value", () => {
    render(<Counter initialValue={10} />);
    expect(screen.getByTestId("count-display")).toHaveTextContent("10");
  });

  it("increments by 1 when increment button clicked", async () => {
    render(<Counter initialValue={5} />);
    await user.click(screen.getByTestId("increment-button"));
    expect(screen.getByTestId("count-display")).toHaveTextContent("6");
  });

  it("decrements by 1 when decrement button clicked", async () => {
    render(<Counter initialValue={5} />);
    await user.click(screen.getByTestId("decrement-button"));
    expect(screen.getByTestId("count-display")).toHaveTextContent("4");
  });

  it("respects custom step value", async () => {
    render(<Counter initialValue={0} step={5} />);
    await user.click(screen.getByTestId("increment-button"));
    expect(screen.getByTestId("count-display")).toHaveTextContent("5");
  });

  it("resets to initial value when reset clicked", async () => {
    render(<Counter initialValue={3} />);
    await user.click(screen.getByTestId("increment-button"));
    await user.click(screen.getByTestId("increment-button"));
    expect(screen.getByTestId("count-display")).toHaveTextContent("5");
    await user.click(screen.getByTestId("reset-button"));
    expect(screen.getByTestId("count-display")).toHaveTextContent("3");
  });

  it("disables decrement button at min value", () => {
    render(<Counter initialValue={0} min={0} />);
    expect(screen.getByTestId("decrement-button")).toBeDisabled();
    expect(screen.getByTestId("increment-button")).not.toBeDisabled();
  });

  it("disables increment button at max value", () => {
    render(<Counter initialValue={10} max={10} />);
    expect(screen.getByTestId("increment-button")).toBeDisabled();
    expect(screen.getByTestId("decrement-button")).not.toBeDisabled();
  });

  it("does not exceed max value", async () => {
    render(<Counter initialValue={9} max={10} />);
    await user.click(screen.getByTestId("increment-button"));
    await user.click(screen.getByTestId("increment-button")); // Would go to 11 without max
    expect(screen.getByTestId("count-display")).toHaveTextContent("10");
  });

  it("calls onChange with new value when count changes", async () => {
    const mockOnChange = jest.fn();
    render(<Counter initialValue={0} onChange={mockOnChange} />);
    await user.click(screen.getByTestId("increment-button"));
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────
// 5. SEARCH BAR TESTS
// ─────────────────────────────────────────────────────────
describe("SearchBar", () => {
  beforeEach(() => {
    // Fake timers: control setTimeout/setInterval manually in tests
    // This lets us test debounce without actually waiting 300ms!
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers(); // Always restore real timers after each test
  });

  it("renders search input with placeholder", () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} placeholder="Find items..." />);
    expect(screen.getByPlaceholderText("Find items...")).toBeInTheDocument();
  });

  it("does NOT call onSearch immediately when typing (debounced)", async () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} debounceMs={300} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "react" },
    });

    // onSearch should NOT have been called yet (debounced)
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("calls onSearch after debounce delay", async () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} debounceMs={300} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "react" },
    });

    // Fast-forward the fake timer by 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith("react");
  });

  it("only fires once after user stops typing (debounce consolidation)", () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} debounceMs={300} />);

    // Simulate rapid typing
    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "r" },
    });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "re" },
    });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "rea" },
    });
    act(() => {
      jest.advanceTimersByTime(300);
    }); // Now debounce fires

    // Should only have called once with the final value
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith("rea");
  });

  it("shows clear button when input has text", () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "react" },
    });
    expect(screen.getByTestId("clear-button")).toBeInTheDocument();
  });

  it("hides clear button when input is empty", () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} />);
    // No input → no clear button
    expect(screen.queryByTestId("clear-button")).not.toBeInTheDocument();
  });

  it("clears input and calls onSearch with empty string when clear clicked", async () => {
    const mockSearch = jest.fn();
    render(<SearchBar onSearch={mockSearch} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "react" },
    });
    fireEvent.click(screen.getByTestId("clear-button"));

    expect(screen.getByTestId("search-input")).toHaveValue("");
    expect(mockSearch).toHaveBeenCalledWith("");
  });
});
