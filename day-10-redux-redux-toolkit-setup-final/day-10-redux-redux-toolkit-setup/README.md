# Day 10: Redux & Redux Toolkit Setup

**Date:** February 24, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Redux Toolkit store with auth, products, and cart slices. Implements createAsyncThunk for API calls, EntityAdapter for normalized state, and memoized selectors with Reselect.

## 🚀 How to Run
```bash
# Terminal 1 - Backend
cd backend && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm start
```

## 📁 File Guide
```
frontend/src/store/
├── index.ts                    ← configureStore, RootState, AppDispatch, typed hooks
├── selectors.ts                ← Memoized selectors with createSelector
└── slices/
    ├── authSlice.ts            ← createAsyncThunk, pending/fulfilled/rejected
    ├── productsSlice.ts        ← createEntityAdapter for normalized state
    └── cartSlice.ts            ← Sync reducers with Immer
```

## 📖 Key Concepts

### When to Use Redux (vs local state)
```
✅ Use Redux for:
   - Auth state (used everywhere)
   - Shopping cart (persisted across pages)
   - Shared lists (products visible in multiple components)
   - Complex cross-component state

❌ Keep in local state:
   - Form input values (useState in the form component)
   - UI state: isOpen, isHovered (local to one component)
   - Data only ONE component needs
```

### Immer Magic (RTK uses it automatically)
```typescript
// RTK reducers look like mutations but ARE immutable!
// Immer intercepts these and creates a new immutable state.
addItem(state, action) {
  state.items.push(action.payload); // ← looks like mutation
  // RTK + Immer converts to: return { ...state, items: [...state.items, action.payload] }
}

// ❌ This won't work (replacing root state reference):
logout(state) {
  state = initialState; // × Assignment to function parameter!
}
// ✅ Correct way to reset:
logout() {
  return initialState; // ✓ Return a new value
}
```

### createAsyncThunk Pattern
```typescript
// 3 auto-generated actions: pending, fulfilled, rejected
const fetchUsers = createAsyncThunk<User[], void>(
  "users/fetchAll",    // action type prefix
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.getUsers();
      return data;                          // → users/fetchAll/fulfilled
    } catch (err) {
      return rejectWithValue(err.message);  // → users/fetchAll/rejected
    }
  }
);

// Handle in extraReducers:
builder
  .addCase(fetchUsers.pending, (state) => { state.loading = true; })
  .addCase(fetchUsers.fulfilled, (state, action) => {
    state.loading = false;
    state.users = action.payload;
  })
  .addCase(fetchUsers.rejected, (state, action) => {
    state.loading = false;
    state.error = action.payload as string;
  });
```

### Normalized State with EntityAdapter
```typescript
// ❌ Array state (O(n) lookups)
state.products = [
  { id: "1", name: "A" },
  { id: "2", name: "B" },
];
const product = state.products.find(p => p.id === "1"); // O(n)!

// ✅ Normalized state (O(1) lookups)
state.products = {
  ids: ["1", "2"],
  entities: { "1": { id: "1", name: "A" }, "2": { id: "2", name: "B" } }
};
const product = state.products.entities["1"]; // O(1)!
```

### Selectors & Reselect
```typescript
// ❌ Without memoization — recalculates on EVERY render
const filteredProducts = useSelector((state) =>
  state.products.items.filter(p => p.category === state.products.selectedCategory)
);

// ✅ With createSelector — only recalculates when inputs change
const selectFilteredProducts = createSelector(
  selectAllProducts,          // Input 1
  selectSelectedCategory,     // Input 2
  (products, category) =>     // Only runs when inputs change!
    category ? products.filter(p => p.category === category) : products
);
```

## ⚠️ Common Gotchas

### 1. Action naming conflicts
```typescript
// ❌ Two slices, both have a "reset" action
// They'll have unique action types: "auth/reset" vs "cart/reset"
// But if you forget the slice prefix, easy to call the wrong one
const { reset: authReset } = authSlice.actions;
const { reset: cartReset } = cartSlice.actions;
```

### 2. Over-using Redux
```typescript
// ❌ Don't put form state in Redux
// It makes every keystroke trigger a Redux action
dispatch(setFormValue({ field: "email", value: "a" })); // on every keypress!

// ✅ Use local useState for forms, only dispatch on submit
const [email, setEmail] = useState(""); // Local
const handleSubmit = () => dispatch(loginUser({ email })); // Redux on submit
```

### 3. useSelector performance
```typescript
// ❌ Returns new object on every render → component always re-renders
const { user, products } = useSelector((state) => ({
  user: state.auth.user,
  products: state.products.items,
}));

// ✅ Separate selectors
const user = useAppSelector(selectCurrentUser);
const products = useAppSelector(selectAllProductsList);
```
