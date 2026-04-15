import { setupDatabase, pool } from "./connection";
setupDatabase().finally(() => pool.end());
