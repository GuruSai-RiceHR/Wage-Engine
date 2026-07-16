import { query } from "../config/db";

export interface LoginHistoryParams {
  user_id: number | null;
  login_status: "SUCCESS" | "FAILED";
  browser: string | null;
  device: string | null;
  operating_system: string | null;
  ip_address: string | null;
}

export const LoginHistoryRepository = {
  async createLoginHistory(log: LoginHistoryParams): Promise<void> {
    await query(
      `INSERT INTO login_history (user_id, login_status, browser, device, operating_system, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        log.user_id,
        log.login_status,
        log.browser,
        log.device,
        log.operating_system,
        log.ip_address
      ]
    );
  },

  async getLoginHistory(params: {
    limit: number;
    offset: number;
  }): Promise<{ logs: any[]; total: number }> {
    const countRes = await query("SELECT COUNT(*) FROM login_history");
    const total = parseInt(countRes.rows[0].count, 10);

    const listRes = await query(
      `SELECT lh.*, u.email as user_email
       FROM login_history lh
       LEFT JOIN users u ON lh.user_id = u.id
       ORDER BY lh.id DESC
       LIMIT $1 OFFSET $2`,
      [params.limit, params.offset]
    );

    return {
      logs: listRes.rows,
      total
    };
  }
};
