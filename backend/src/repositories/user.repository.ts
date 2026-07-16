import { query } from "../config/db";

export interface UserRow {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  password_hash: string;
  role: "USER" | "ADMIN";
  is_paid: boolean;
  simple_trial_used: number;
  dynamic_trial_used: number;
  validation_count: number;
  registered_at: Date;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const UserRepository = {
  async findById(id: number): Promise<UserRow | null> {
    const res = await query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0] || null;
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const res = await query("SELECT * FROM users WHERE email = $1", [email]);
    return res.rows[0] || null;
  },

  async findByUsername(username: string): Promise<UserRow | null> {
    const res = await query("SELECT * FROM users WHERE username = $1", [username]);
    return res.rows[0] || null;
  },

  async createUser(user: {
    username: string;
    full_name: string;
    email: string;
    phone?: string;
    company_name?: string;
    password_hash: string;
    role?: "USER" | "ADMIN";
  }): Promise<UserRow> {
    const res = await query(
      `INSERT INTO users (username, full_name, email, phone, company_name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7::user_role)
       RETURNING *`,
      [
        user.username,
        user.full_name,
        user.email,
        user.phone || null,
        user.company_name || null,
        user.password_hash,
        user.role || "USER"
      ]
    );
    return res.rows[0];
  },

  async updateLoginTimes(id: number): Promise<void> {
    const now = new Date();
    await query(
      "UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2",
      [now, id]
    );
  },

  async updateTrialUsage(id: number, mode: "SIMPLE" | "DYNAMIC", newCount: number): Promise<void> {
    const column = mode === "SIMPLE" ? "simple_trial_used" : "dynamic_trial_used";
    await query(
      `UPDATE users SET ${column} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newCount, id]
    );
  },

  async incrementValidationCount(id: number): Promise<number> {
    const res = await query(
      "UPDATE users SET validation_count = validation_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING validation_count",
      [id]
    );
    return res.rows[0]?.validation_count || 0;
  },

  async upgradePaidStatus(id: number, isPaid: boolean): Promise<void> {
    await query(
      "UPDATE users SET is_paid = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [isPaid, id]
    );
  },

  async getAllUsers(params: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ users: Omit<UserRow, "password_hash">[]; total: number }> {
    const searchVal = params.search ? `%${params.search}%` : "%";
    
    // Total count query
    const countRes = await query(
      `SELECT COUNT(*) FROM users 
       WHERE username ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1 OR company_name ILIKE $1`,
      [searchVal]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // List query
    const listRes = await query(
      `SELECT id, username, full_name, email, phone, company_name, role, is_paid, 
              simple_trial_used, dynamic_trial_used, validation_count, registered_at, last_login_at, created_at, updated_at 
       FROM users 
       WHERE username ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1 OR company_name ILIKE $1
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [searchVal, params.limit, params.offset]
    );

    return {
      users: listRes.rows,
      total
    };
  },

  async updateUserRole(id: number, role: "USER" | "ADMIN"): Promise<void> {
    await query(
      "UPDATE users SET role = $1::user_role, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [role, id]
    );
  }
};
