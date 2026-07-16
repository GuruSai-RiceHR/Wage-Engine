import { query } from "../config/db";

export interface ValidationHistoryRow {
  id: number;
  user_id: number | null;
  mode: string;
  components: any;
  status: string;
  issues: any;
  suggestions: any;
  recommended_structure: any;
  financial_impact: any;
  created_at: Date;
}

export interface ValidationLogParams {
  validation_id: number | null;
  user_id: number | null;
  browser: string | null;
  device: string | null;
  operating_system: string | null;
  ip_address: string | null;
  api_endpoint: string;
  http_status: number;
  execution_time: number | null;
}

export const ValidationRepository = {
  async createValidationHistory(history: {
    user_id: number | null;
    mode: string;
    components: any;
    status: string;
    issues: any;
    suggestions: any;
    recommended_structure: any;
    financial_impact: any;
  }): Promise<ValidationHistoryRow> {
    const res = await query(
      `INSERT INTO validation_history (user_id, mode, components, status, issues, suggestions, recommended_structure, financial_impact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        history.user_id,
        history.mode,
        JSON.stringify(history.components),
        history.status,
        JSON.stringify(history.issues),
        JSON.stringify(history.suggestions),
        JSON.stringify(history.recommended_structure),
        JSON.stringify(history.financial_impact)
      ]
    );
    return res.rows[0];
  },

  async getHistoryByUserId(userId: number, limit = 50): Promise<ValidationHistoryRow[]> {
    const res = await query(
      `SELECT id, user_id, mode, components, status, issues, suggestions,
              recommended_structure AS "recommendedStructure",
              financial_impact AS "financialImpact", created_at
       FROM validation_history WHERE user_id = $1 ORDER BY id DESC LIMIT $2`,
      [userId, limit]
    );
    return res.rows;
  },

  async createValidationLog(log: ValidationLogParams): Promise<void> {
    await query(
      `INSERT INTO validation_logs (validation_id, user_id, browser, device, operating_system, ip_address, api_endpoint, http_status, execution_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        log.validation_id,
        log.user_id,
        log.browser,
        log.device,
        log.operating_system,
        log.ip_address,
        log.api_endpoint,
        log.http_status,
        log.execution_time
      ]
    );
  },

  async getValidationLogs(params: {
    limit: number;
    offset: number;
  }): Promise<{ logs: any[]; total: number }> {
    const countRes = await query("SELECT COUNT(*) FROM validation_logs");
    const total = parseInt(countRes.rows[0].count, 10);

    const listRes = await query(
      `SELECT vl.*, u.email as user_email,
              vh.mode, vh.components, vh.status, vh.issues, vh.suggestions,
              vh.recommended_structure AS "recommendedStructure",
              vh.financial_impact AS "financialImpact"
       FROM validation_logs vl
       LEFT JOIN users u ON vl.user_id = u.id
       LEFT JOIN validation_history vh ON vl.validation_id = vh.id
       ORDER BY vl.id DESC
       LIMIT $1 OFFSET $2`,
      [params.limit, params.offset]
    );

    return {
      logs: listRes.rows,
      total
    };
  },

  async getStatistics(): Promise<{
    totalValidations: number;
    compliantCount: number;
    nonCompliantCount: number;
    simpleCount: number;
    dynamicCount: number;
  }> {
    const res = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'COMPLIANT' THEN 1 END) as compliant,
        COUNT(CASE WHEN status = 'NON_COMPLIANT' THEN 1 END) as non_compliant,
        COUNT(CASE WHEN mode = 'SIMPLE' THEN 1 END) as simple,
        COUNT(CASE WHEN mode = 'DYNAMIC' THEN 1 END) as dynamic
      FROM validation_history
    `);

    const row = res.rows[0];
    return {
      totalValidations: parseInt(row.total, 10) || 0,
      compliantCount: parseInt(row.compliant, 10) || 0,
      nonCompliantCount: parseInt(row.non_compliant, 10) || 0,
      simpleCount: parseInt(row.simple, 10) || 0,
      dynamicCount: parseInt(row.dynamic, 10) || 0
    };
  }
};
