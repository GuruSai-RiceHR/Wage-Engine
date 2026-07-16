import { query } from "../config/db";

export interface AuditLogParams {
  user_id: number | null;
  action: "REGISTER" | "LOGIN" | "LOGOUT" | "VALIDATE" | "UPGRADE" | "PROFILE_UPDATE" | "ADMIN_ACTION";
  description: string;
  metadata?: any;
}

export const AuditRepository = {
  async createAuditLog(log: AuditLogParams): Promise<void> {
    await query(
      `INSERT INTO audit_logs (user_id, action, description, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        log.user_id,
        log.action,
        log.description,
        log.metadata ? JSON.stringify(log.metadata) : null
      ]
    );
  },

  async getAuditLogs(params: {
    action?: string;
    limit: number;
    offset: number;
  }): Promise<{ logs: any[]; total: number }> {
    let countQuery = "SELECT COUNT(*) FROM audit_logs";
    let listQuery = `
      SELECT al.*, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const queryParams: any[] = [];

    if (params.action) {
      countQuery += " WHERE action = $1";
      listQuery += " WHERE al.action = $1";
      queryParams.push(params.action);
    }

    const countRes = await query(countQuery, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    const limitIndex = queryParams.length + 1;
    const offsetIndex = queryParams.length + 2;
    listQuery += ` ORDER BY al.id DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
    
    const listParams = [...queryParams, params.limit, params.offset];
    const listRes = await query(listQuery, listParams);

    return {
      logs: listRes.rows,
      total
    };
  }
};
