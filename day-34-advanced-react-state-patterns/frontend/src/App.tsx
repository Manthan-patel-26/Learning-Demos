/**
 * ============================================================
 * DAY 34: ADVANCED REACT STATE — XState State Machines
 * ============================================================
 * State machines prevent "impossible states" — situations like:
 *   isLoading: true AND isError: true AND isSuccess: true
 * With a state machine, you're ALWAYS in exactly ONE state.
 *
 * CHECKOUT FLOW:
 *  idle → cart → shipping → payment → confirming → confirmed
 *                                   ↘ paymentError → payment (retry)
 *
 * WHY STATE MACHINES?
 *  - "Impossible states" become literally impossible
 *  - Every transition is explicit and documented
 *  - Business logic is separate from UI rendering
 *  - Easy to test (just send events, check state)
 *  - Can be visualized: https://stately.ai/viz
 */
import React, { useEffect } from "react";
import { createMachine, assign } from "xstate";
import { useMachine } from "@xstate/react";

// ─── TYPES ────────────────────────────────────────────────
interface CartItem { id: string; name: string; price: number; quantity: number; }
interface ShippingInfo { name: string; address: string; city: string; zip: string; }
interface PaymentInfo { cardNumber: string; expiry: string; cvv: string; }

interface CheckoutContext {
  cartItems: CartItem[];
  shipping: Partial<ShippingInfo>;
  payment: Partial<PaymentInfo>;
  orderId: string | null;
  errorMessage: string | null;
  retryCount: number;
}

// ─── THE STATE MACHINE ────────────────────────────────────
// This is the heart of Day 34 — a fully typed, XState v5 machine
const checkoutMachine = createMachine({
  id: "checkout",
  initial: "cart",

  // context = the machine's data (like useState values)
  context: {
    cartItems: [
      { id: "1", name: "TypeScript Handbook", price: 29.99, quantity: 1 },
      { id: "2", name: "React Patterns", price: 39.99, quantity: 2 },
    ],
    shipping: {},
    payment: {},
    orderId: null,
    errorMessage: null,
    retryCount: 0,
  } as CheckoutContext,

  // Types block: documents all events this machine accepts
  types: {} as {
    events:
      | { type: "NEXT" }
      | { type: "BACK" }
      | { type: "RESET" }
      | { type: "UPDATE_SHIPPING"; data: Partial<ShippingInfo> }
      | { type: "UPDATE_PAYMENT"; data: Partial<PaymentInfo> }
      | { type: "SUBMIT_PAYMENT" }
      | { type: "PAYMENT_SUCCESS"; orderId: string }
      | { type: "PAYMENT_FAILURE"; error: string }
      | { type: "RETRY" };
  },

  states: {
    // ── STATE: cart ────────────────────────────────────────
    // User reviews their cart items
    cart: {
      on: {
        NEXT: "shipping",    // Go to shipping
        RESET: { target: "cart", actions: assign({ cartItems: [], shipping: {}, payment: {}, orderId: null, errorMessage: null, retryCount: 0 }) },
      },
    },

    // ── STATE: shipping ────────────────────────────────────
    shipping: {
      on: {
        BACK: "cart",
        NEXT: {
          target: "payment",
          guard: ({ context }) => {
            const s = context.shipping;
            return !!(s.name && s.address && s.city && s.zip);
          },
        },
        UPDATE_SHIPPING: {
          actions: assign(({ context, event }) => ({
            shipping: { ...context.shipping, ...event.data },
          })),
        },
      },
    },

    // ── STATE: payment ─────────────────────────────────────
    payment: {
      on: {
        BACK: "shipping",
        UPDATE_PAYMENT: {
          actions: assign(({ context, event }) => ({
            payment: { ...context.payment, ...event.data },
            errorMessage: null,  // Clear error when user edits
          })),
        },
        SUBMIT_PAYMENT: {
          target: "confirming",
          guard: ({ context }) => {
            const p = context.payment;
            return !!(p.cardNumber && p.expiry && p.cvv);
          },
        },
      },
    },

    // ── STATE: confirming ──────────────────────────────────
    // Payment is being processed — no user input allowed!
    confirming: {
      // entry: runs when entering this state
      entry: assign({ errorMessage: null }),
      on: {
        PAYMENT_SUCCESS: {
          target: "confirmed",
          actions: assign(({ event }) => ({ orderId: event.orderId })),
        },
        PAYMENT_FAILURE: {
          target: "paymentError",
          actions: assign(({ context, event }) => ({
            errorMessage: event.error,
            retryCount: context.retryCount + 1,
          })),
        },
      },
    },

    // ── STATE: paymentError ────────────────────────────────
    // Payment failed — allow retry or go back to edit
    paymentError: {
      on: {
        RETRY: {
          target: "confirming",
          guard: ({ context }) => context.retryCount < 3, // Max 3 retries
        },
        BACK: "payment",     // Go back to edit payment info
      },
    },

    // ── STATE: confirmed ───────────────────────────────────
    // Terminal state — order is placed
    confirmed: {
      type: "final",
      on: { RESET: "cart" },
    },
  },
});

// ─── STEP INDICATOR ───────────────────────────────────────
const STEPS = ["cart", "shipping", "payment", "confirming", "confirmed"] as const;
const STEP_LABELS = { cart: "Cart", shipping: "Shipping", payment: "Payment", confirming: "Processing", confirmed: "Confirmed" };

function StepIndicator({ current }: { current: string }) {
  const stepIndex = STEPS.indexOf(current as typeof STEPS[number]);
  return (
    <div style={{ display: "flex", marginBottom: 24 }}>
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i < stepIndex ? "#48bb78" : i === stepIndex ? "#4299e1" : "#e2e8f0",
              color: i <= stepIndex ? "#fff" : "#a0aec0", fontWeight: 700, fontSize: 14,
            }}>
              {i < stepIndex ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 11, marginTop: 4, color: i === stepIndex ? "#4299e1" : "#a0aec0" }}>
              {STEP_LABELS[step]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ height: 2, background: i < stepIndex ? "#48bb78" : "#e2e8f0", flex: 1, marginTop: 15, alignSelf: "flex-start" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────
export default function App() {
  const [state, send] = useMachine(checkoutMachine);
  const { context } = state;

  // Simulate async payment processing when in "confirming" state
  useEffect(() => {
    if (state.matches("confirming")) {
      const timer = setTimeout(() => {
        // 30% chance of failure for demo purposes
        if (Math.random() < 0.3) {
          send({ type: "PAYMENT_FAILURE", error: "Card declined — simulated failure (retry up to 3 times)" });
        } else {
          send({ type: "PAYMENT_SUCCESS", orderId: `ORD-${Date.now()}` });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, send]);

  const total = context.cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const card: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" };
  const input: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e0", fontSize: 14, boxSizing: "border-box", marginBottom: 10 };
  const btnStyle = (c = "#4299e1", disabled = false): React.CSSProperties => ({
    padding: "10px 20px", borderRadius: 6, border: "none",
    background: disabled ? "#e2e8f0" : c, color: disabled ? "#a0aec0" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14,
  });

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>🛒 Day 34: XState Checkout Machine</h1>

        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 13 }}>
          Current state: <strong style={{ color: "#4299e1" }}>{state.value as string}</strong>
          {context.retryCount > 0 && <span style={{ marginLeft: 12, color: "#e53e3e" }}>Retries: {context.retryCount}/3</span>}
        </div>

        <StepIndicator current={state.value as string} />

        <div style={card}>
          {/* CART STATE */}
          {state.matches("cart") && (
            <div>
              <h3 style={{ marginTop: 0 }}>Your Cart</h3>
              {context.cartItems.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span>{item.name} ×{item.quantity}</span>
                  <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 700 }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
              <button onClick={() => send({ type: "NEXT" })} style={{ ...btnStyle(), marginTop: 16, width: "100%" }}>
                Proceed to Shipping →
              </button>
            </div>
          )}

          {/* SHIPPING STATE */}
          {state.matches("shipping") && (
            <div>
              <h3 style={{ marginTop: 0 }}>Shipping Information</h3>
              {[["name","Full Name","Alice Smith"],["address","Address","123 Main St"],["city","City","New York"],["zip","ZIP Code","10001"]].map(([field, label, placeholder]) => (
                <input key={field} placeholder={`${label}*`} defaultValue={placeholder}
                  onChange={e => send({ type: "UPDATE_SHIPPING", data: { [field]: e.target.value } })}
                  style={input} />
              ))}
              {/* Guard prevents NEXT if fields are empty */}
              {!context.shipping.name && <p style={{ fontSize: 12, color: "#e53e3e" }}>Fill all fields to continue</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => send({ type: "BACK" })} style={btnStyle("#718096")}>← Back</button>
                <button onClick={() => send({ type: "NEXT" })}
                  disabled={!context.shipping.name}
                  style={btnStyle("#4299e1", !context.shipping.name)}>
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT STATE */}
          {state.matches("payment") && (
            <div>
              <h3 style={{ marginTop: 0 }}>Payment Details</h3>
              <input placeholder="Card Number* (try any 16 digits)" defaultValue="4111111111111111"
                onChange={e => send({ type: "UPDATE_PAYMENT", data: { cardNumber: e.target.value } })} style={input} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <input placeholder="Expiry (MM/YY)*" defaultValue="12/28"
                  onChange={e => send({ type: "UPDATE_PAYMENT", data: { expiry: e.target.value } })}
                  style={{ ...input, marginBottom: 0 }} />
                <input placeholder="CVV*" defaultValue="123"
                  onChange={e => send({ type: "UPDATE_PAYMENT", data: { cvv: e.target.value } })}
                  style={{ ...input, marginBottom: 0 }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => send({ type: "BACK" })} style={btnStyle("#718096")}>← Back</button>
                <button onClick={() => send({ type: "SUBMIT_PAYMENT" })} style={btnStyle("#48bb78")}>
                  Pay ${total.toFixed(2)}
                </button>
              </div>
              <p style={{ fontSize: 12, color: "#718096", marginBottom: 0 }}>~30% chance of failure — tests retry logic</p>
            </div>
          )}

          {/* CONFIRMING STATE */}
          {state.matches("confirming") && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <h3>Processing Payment...</h3>
              <p style={{ color: "#718096" }}>Please don't close this page. Do NOT add a "Back" button here — impossible state prevention!</p>
            </div>
          )}

          {/* PAYMENT ERROR STATE */}
          {state.matches("paymentError") && (
            <div>
              <div style={{ background: "#fff5f5", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <h3 style={{ color: "#c53030", marginTop: 0 }}>❌ Payment Failed</h3>
                <p style={{ color: "#742a2a" }}>{context.errorMessage}</p>
                <p style={{ fontSize: 13, color: "#718096" }}>Attempt {context.retryCount} of 3</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => send({ type: "BACK" })} style={btnStyle("#718096")}>← Edit Payment</button>
                {context.retryCount < 3 && (
                  <button onClick={() => send({ type: "RETRY" })} style={btnStyle("#ed8936")}>
                    🔄 Retry Payment
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CONFIRMED STATE */}
          {state.matches("confirmed") && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 60 }}>🎉</div>
              <h2 style={{ color: "#38a169" }}>Order Confirmed!</h2>
              <p style={{ color: "#718096" }}>Order ID: <strong>{context.orderId}</strong></p>
              <button onClick={() => send({ type: "RESET" })} style={{ ...btnStyle("#4299e1"), marginTop: 12 }}>
                Start New Order
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, background: "#fffbeb", borderRadius: 8, padding: 12, fontSize: 12 }}>
          <strong>🎓 What makes this a state machine:</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Only ONE state at a time — no "isLoading AND isError" confusion</li>
            <li>Guards prevent invalid transitions (can't skip shipping)</li>
            <li>entry/exit actions run automatically on state changes</li>
            <li>"confirming" disables all input — no back button possible</li>
            <li>retryCount &gt;= 3 disables RETRY — guard enforced</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
