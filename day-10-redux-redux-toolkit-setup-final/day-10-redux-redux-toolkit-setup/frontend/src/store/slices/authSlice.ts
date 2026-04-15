/**
 * ============================================================
 * AUTH SLICE - createSlice + createAsyncThunk
 * ============================================================
 * Manages: user authentication state
 * Shows: createAsyncThunk, error handling, loading states
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// ─── TYPES ────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  // Separate loading/error per operation (not one global flag)
  loading: {
    fetchUser: boolean;
    login: boolean;
  };
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: { fetchUser: false, login: false },
  error: null,
};

// ─── ASYNC THUNKS ─────────────────────────────────────────
// createAsyncThunk<ReturnType, ArgType>
// Automatically generates pending/fulfilled/rejected actions

export const fetchCurrentUser = createAsyncThunk<User>(
  "auth/fetchCurrentUser", // Action type prefix
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("http://localhost:3001/api/auth/me");
      const data = await res.json();
      if (data.status !== "success")
        throw new Error(data.error?.message ?? "Failed");
      return data.data as User;
    } catch (error) {
      // rejectWithValue: passes the error to the `rejected` case handler
      // Without this, you'd get a generic SerializedError
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  },
);

export const loginUser = createAsyncThunk<
  User,
  { email: string; password: string }
>("auth/loginUser", async (credentials, { rejectWithValue }) => {
  try {
    // Simulated login (Day 8 auth would handle this properly)
    await new Promise((r) => setTimeout(r, 500));
    if (credentials.email !== "alice@example.com") {
      return rejectWithValue("Invalid credentials");
    }
    return {
      id: "u1",
      name: "Alice",
      email: credentials.email,
      role: "admin",
    } as User;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Login failed",
    );
  }
});

// ─── SLICE ────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Synchronous actions (reducers in createSlice use Immer under the hood)
    // Immer lets you WRITE mutating code: state.user = null
    // RTK converts it to an immutable update automatically!
    logout(state) {
      // This LOOKS like mutation but Immer makes it safe
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
    // PayloadAction<T> types the action payload
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  // extraReducers handles actions from createAsyncThunk
  extraReducers: (builder) => {
    // Pattern: handle pending/fulfilled/rejected for each thunk
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading.fetchUser = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading.fetchUser = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading.fetchUser = false;
        // action.payload is what we passed to rejectWithValue()
        state.error =
          (action.payload as string) ?? action.error.message ?? "Unknown error";
        state.isAuthenticated = false;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading.login = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading.login = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading.login = false;
        state.error = (action.payload as string) ?? "Login failed";
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
