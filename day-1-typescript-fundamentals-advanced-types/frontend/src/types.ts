/**
 * ============================================================
 * FRONTEND TYPES - Mirror your backend types here
 * ============================================================
 * In a real project, you'd share these via a shared package
 * or auto-generate them from your OpenAPI schema.
 */

// Discriminated union for API responses (same as backend)
export type ApiSuccess<T> = {
  status: "success";
  data: T;
  message: string;
  timestamp: string;
};

export type ApiError = {
  status: "error";
  error: { code: string; message: string };
  timestamp: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Domain types
export type Role = "admin" | "user" | "guest";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

// Utility type usage
export type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;
export type UpdateUserInput = Partial<Pick<User, "name" | "email" | "role">>;

// Component prop types using generics
export type ListProps<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
};
