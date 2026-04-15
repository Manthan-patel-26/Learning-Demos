/**
 * ============================================================
 * REPOSITORY PATTERN - Type-Safe Database Operations
 * ============================================================
 * The Repository Pattern separates database access from business logic.
 *
 * WHY USE THIS PATTERN?
 *  1. Your routes/services don't write SQL — they call repo methods
 *  2. Swap out PostgreSQL for MongoDB? Only change the repository
 *  3. Easy to mock in unit tests
 *  4. All DB logic is in one place — easy to audit and optimize
 *
 * STRUCTURE:
 *  - BaseRepository<T>: Generic CRUD operations for any entity
 *  - UserRepository: Extends Base + adds user-specific queries
 *  - ProductRepository: Extends Base + product-specific queries
 */

import { Pool, PoolClient } from "pg";

// ─── BASE TYPES ───────────────────────────────────────────

// Every entity stored in the DB has these fields
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// Filter options passed to list() method
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}

// ─── ABSTRACT BASE REPOSITORY ─────────────────────────────
/**
 * Generic repository with standard CRUD operations.
 * T = the entity type (e.g., User, Product)
 * C = the "create input" type (T without server-generated fields)
 * U = the "update input" type (partial version of C)
 *
 * Abstract class: can't be instantiated directly.
 * Subclasses must implement `tableName` and `schemaName`.
 */
export abstract class BaseRepository<
  T extends BaseEntity,
  C extends Record<string, unknown>,
  U extends Partial<C>
> {
  // Subclasses define which table they manage
  protected abstract readonly tableName: string;
  protected readonly schemaName: string = "shop";

  constructor(protected readonly pool: Pool) {}

  /**
   * Get the fully-qualified table name: "shop.users", "shop.products"
   */
  protected get table(): string {
    return `${this.schemaName}.${this.tableName}`;
  }

  /**
   * Find one entity by ID.
   * Returns null (not throws) if not found — cleaner error handling.
   */
  async findById(id: string): Promise<T | null> {
    const { rows } = await this.pool.query<T>(
      `SELECT * FROM ${this.table} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ?? null; // ?? null: return null if undefined
  }

  /**
   * List entities with pagination.
   * Returns { data, total } — total is for pagination UI.
   */
  async findAll(options: QueryOptions = {}): Promise<{ data: T[]; total: number }> {
    const {
      limit = 20,
      offset = 0,
      orderBy = "created_at",
      orderDir = "DESC",
    } = options;

    // IMPORTANT: orderBy comes from OUR code, not user input, so it's safe here.
    // If it came from user input, we'd need to whitelist valid column names.
    const { rows } = await this.pool.query<T>(
      `SELECT * FROM ${this.table}
       ORDER BY ${orderBy} ${orderDir}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count for pagination
    const { rows: countRows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM ${this.table}`
    );

    return {
      data: rows,
      total: parseInt(countRows[0]?.count ?? "0"),
    };
  }

  /**
   * Create an entity using a transaction client or the pool directly.
   * Passing a PoolClient allows this to be part of a larger transaction.
   */
  async create(data: C, client?: PoolClient): Promise<T> {
    const db = client ?? this.pool;
    const keys = Object.keys(data);
    const values = Object.values(data);
    // Build: INSERT INTO table (col1, col2) VALUES ($1, $2) RETURNING *
    const cols = keys.join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const { rows } = await db.query<T>(
      `INSERT INTO ${this.table} (${cols})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );

    return rows[0]!; // We know it exists — we just inserted it
  }

  /**
   * Update specific fields of an entity.
   * Only updates fields provided in `data` (PATCH semantics).
   */
  async update(id: string, data: U, client?: PoolClient): Promise<T | null> {
    const db = client ?? this.pool;
    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id); // Nothing to update

    const values = Object.values(data);
    // Build: SET col1 = $1, col2 = $2, updated_at = NOW()
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");

    const { rows } = await db.query<T>(
      `UPDATE ${this.table}
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${keys.length + 1}
       RETURNING *`,
      [...values, id]
    );

    return rows[0] ?? null;
  }

  /**
   * Soft delete: set deleted_at instead of removing the row.
   * WHY: Audit trail, data recovery, referential integrity.
   */
  async softDelete(id: string, client?: PoolClient): Promise<boolean> {
    const db = client ?? this.pool;
    const { rowCount } = await db.query(
      `UPDATE ${this.table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  /**
   * Hard delete: permanently remove. Use sparingly.
   */
  async hardDelete(id: string, client?: PoolClient): Promise<boolean> {
    const db = client ?? this.pool;
    const { rowCount } = await db.query(
      `DELETE FROM ${this.table} WHERE id = $1`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  }
}

// ─── USER REPOSITORY ──────────────────────────────────────

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: "admin" | "customer" | "vendor";
  deleted_at: Date | null;
}

export type CreateUserInput = Pick<User, "email" | "name" | "role">;
export type UpdateUserInput = Partial<Pick<User, "name" | "role">>;

export class UserRepository extends BaseRepository<User, CreateUserInput, UpdateUserInput> {
  protected readonly tableName = "users";

  /** Find a user by email — for login lookups */
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<User>(
      `SELECT * FROM ${this.table} WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [email.toLowerCase()]
    );
    return rows[0] ?? null;
  }

  /** Get users with their order count and total spent */
  async findWithStats(): Promise<(User & { order_count: number; total_spent: number })[]> {
    const { rows } = await this.pool.query(
      `SELECT u.*,
         COUNT(o.id)::int AS order_count,
         COALESCE(SUM(o.total_amount), 0)::float AS total_spent
       FROM ${this.table} u
       LEFT JOIN shop.orders o ON o.user_id = u.id AND o.status != 'cancelled'
       WHERE u.deleted_at IS NULL
       GROUP BY u.id
       ORDER BY total_spent DESC`
    );
    return rows;
  }
}

// ─── PRODUCT REPOSITORY ───────────────────────────────────

export interface Product extends BaseEntity {
  name: string;
  description: string | null;
  price: string; // PostgreSQL DECIMAL → string
  stock: number;
  sku: string | null;
  category_id: string | null;
  is_active: boolean;
}

export type CreateProductInput = Pick<Product, "name" | "price" | "stock"> &
  Partial<Pick<Product, "description" | "sku" | "category_id">>;
export type UpdateProductInput = Partial<CreateProductInput & Pick<Product, "is_active">>;

export class ProductRepository extends BaseRepository<Product, CreateProductInput, UpdateProductInput> {
  protected readonly tableName = "products";

  /** Find products with category name and rating (aggregation query) */
  async findWithDetails(): Promise<unknown[]> {
    const { rows } = await this.pool.query(`
      SELECT p.*, c.name AS category_name,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
        COUNT(r.id)::int AS review_count
      FROM ${this.table} p
      LEFT JOIN shop.categories c ON p.category_id = c.id
      LEFT JOIN shop.reviews r ON r.product_id = p.id
      WHERE p.is_active = TRUE
      GROUP BY p.id, c.name
      ORDER BY avg_rating DESC
    `);
    return rows;
  }

  /** Decrement stock within a transaction (prevents overselling) */
  async decrementStock(productId: string, qty: number, client: PoolClient): Promise<boolean> {
    const { rowCount } = await client.query(
      `UPDATE ${this.table}
       SET stock = stock - $1, updated_at = NOW()
       WHERE id = $2 AND stock >= $1`,
      [qty, productId]
    );
    return (rowCount ?? 0) > 0; // false = insufficient stock
  }
}
