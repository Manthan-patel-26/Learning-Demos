/**
 * ============================================================
 * DAY 10: Redux Toolkit - Complete Store Demo
 * ============================================================
 */
import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch, useAppSelector } from "./store";
import {
  fetchProducts,
  setSelectedCategory,
} from "./store/slices/productsSlice";
import { fetchCurrentUser, loginUser, logout } from "./store/slices/authSlice";
import {
  addItem,
  removeItem,
  updateQuantity,
  checkout,
  clearCart,
} from "./store/slices/cartSlice";
import {
  selectFilteredProducts,
  selectCategories,
  selectCartItemCount,
  selectCartSubtotal,
  selectCartWithDetails,
  selectCurrentUser,
  selectIsAuthenticated,
  selectProductsLoading,
  selectProductsError,
  selectCheckoutStatus,
  selectSelectedCategory,
} from "./store/selectors";

// ─── INNER APP (inside <Provider>) ────────────────────────
function AppInner() {
  const dispatch = useAppDispatch();

  // Selectors — all memoized with reselect
  const products = useAppSelector(selectFilteredProducts);
  const categories = useAppSelector(selectCategories);
  const isLoading = useAppSelector(selectProductsLoading);
  const productsError = useAppSelector(selectProductsError);
  const cartCount = useAppSelector(selectCartItemCount);
  const cartSubtotal = useAppSelector(selectCartSubtotal);
  const cartItems = useAppSelector(selectCartWithDetails);
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const checkoutStatus = useAppSelector(selectCheckoutStatus);
  const selectedCategory = useAppSelector(selectSelectedCategory);

  // Load data on mount
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 10,
    padding: 16,
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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0, color: "#2d3748" }}>
            🛒 Day 10: Redux Toolkit
          </h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {isAuthenticated ? (
              <>
                <span style={{ fontSize: 14, color: "#718096" }}>
                  👤 {currentUser?.name} ({currentUser?.role})
                </span>
                <button
                  onClick={() => dispatch(logout())}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#fed7d7",
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() =>
                  dispatch(
                    loginUser({ email: "alice@example.com", password: "pass" }),
                  )
                }
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "#c6f6d5",
                  cursor: "pointer",
                }}
              >
                Login (Demo)
              </button>
            )}
            <div
              style={{
                background: "#4299e1",
                color: "#fff",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {cartCount}
            </div>
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}
        >
          {/* LEFT: PRODUCTS */}
          <div>
            {/* Category Filter */}
            <div style={{ ...card, padding: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => dispatch(setSelectedCategory(null))}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    background: !selectedCategory ? "#4299e1" : "#e2e8f0",
                    color: !selectedCategory ? "#fff" : "#4a5568",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => dispatch(setSelectedCategory(cat))}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      background:
                        selectedCategory === cat ? "#4299e1" : "#e2e8f0",
                      color: selectedCategory === cat ? "#fff" : "#4a5568",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      textTransform: "capitalize",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products */}
            {isLoading && (
              <div style={{ textAlign: "center", padding: 40 }}>
                Loading products...
              </div>
            )}
            {productsError && (
              <div style={{ ...card, background: "#fff5f5", color: "#c53030" }}>
                ⚠ {productsError} — Make sure backend is running on port 3001
              </div>
            )}
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  ...card,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{product.name}</div>
                  <div style={{ fontSize: 13, color: "#718096" }}>
                    {product.category} · ⭐ {product.rating} · {product.stock}{" "}
                    in stock
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#4299e1" }}>
                    ${product.price}
                  </span>
                  <button
                    onClick={() =>
                      dispatch(
                        addItem({
                          productId: product.id,
                          name: product.name,
                          price: product.price,
                        }),
                      )
                    }
                    disabled={product.stock === 0}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "none",
                      background: product.stock === 0 ? "#e2e8f0" : "#4299e1",
                      color: product.stock === 0 ? "#a0aec0" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: CART */}
          <div>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>🛒 Cart ({cartCount} items)</h3>
              {cartItems.length === 0 ? (
                <p style={{ color: "#a0aec0", fontSize: 13 }}>
                  Your cart is empty
                </p>
              ) : (
                <>
                  {cartItems.map((item) => (
                    <div
                      key={item.productId}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        padding: "8px 0",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {item.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <button
                          onClick={() =>
                            dispatch(
                              updateQuantity({
                                productId: item.productId,
                                quantity: item.quantity - 1,
                              }),
                            )
                          }
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: "1px solid #cbd5e0",
                            cursor: "pointer",
                          }}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 20, textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            dispatch(
                              updateQuantity({
                                productId: item.productId,
                                quantity: item.quantity + 1,
                              }),
                            )
                          }
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: "1px solid #cbd5e0",
                            cursor: "pointer",
                          }}
                        >
                          +
                        </button>
                        <span style={{ marginLeft: "auto", fontWeight: 600 }}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => dispatch(removeItem(item.productId))}
                          style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            border: "none",
                            background: "#fed7d7",
                            cursor: "pointer",
                            color: "#c53030",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "2px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      <span>Total</span>
                      <span style={{ color: "#4299e1" }}>
                        ${cartSubtotal.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => dispatch(checkout(cartItems))}
                      disabled={checkoutStatus === "loading"}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 6,
                        border: "none",
                        background:
                          checkoutStatus === "loading" ? "#90cdf4" : "#48bb78",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {checkoutStatus === "loading"
                        ? "Processing..."
                        : "Checkout"}
                    </button>
                    {checkoutStatus === "success" && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 8,
                          background: "#c6f6d5",
                          borderRadius: 6,
                          fontSize: 12,
                          textAlign: "center",
                        }}
                      >
                        ✅ Order placed!{" "}
                        <button
                          onClick={() => dispatch(clearCart())}
                          style={{
                            border: "none",
                            background: "none",
                            color: "#276749",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Redux DevTools hint */}
            <div style={{ ...card, background: "#fffbeb", fontSize: 12 }}>
              <strong>💡 Install Redux DevTools</strong>
              <p style={{ margin: "4px 0 0" }}>
                Chrome Extension → Redux DevTools
                <br />
                See state tree, action log, and time-travel debugging!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap with Provider at the top level
export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}
