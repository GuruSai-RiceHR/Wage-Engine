import { Response } from "express";
import { query } from "../config/db";
import { UserRepository } from "../repositories/user.repository";
import { ValidationRepository } from "../repositories/validation.repository";
import { AuditRepository } from "../repositories/audit.repository";
import { validateWages } from "../services/wageEngine";
import { CustomRequest } from "../middleware/authMiddleware";

export const ValidateController = {
  async validate(req: CustomRequest, res: Response) {
    const startTime = Date.now();
    const { components, mode, overtimeHours = 0, overtimeRate = 0 } = req.body;
    const client = req.clientInfo;
    const userPayload = req.user;
    const clientIp = client?.ip || "127.0.0.1";

    if (!mode || !components || !Array.isArray(components)) {
      return res.status(400).json({ status: "ERROR", message: "Invalid payload: mode and components are required." });
    }

    try {
      let userId: number | null = null;
      let isPremium = false;

      // 1. Guest Trial Checks
      if (!userPayload) {
        // Query to check number of validations from this IP address in this mode for guest
        const guestCountRes = await query(
          `SELECT COUNT(*) FROM validation_history vh
           JOIN validation_logs vl ON vh.id = vl.validation_id
           WHERE vh.user_id IS NULL AND vh.mode = $1 AND vl.ip_address = $2`,
          [mode, clientIp]
        );
        const guestCount = parseInt(guestCountRes.rows[0].count, 10);

        if (guestCount >= 2) {
          return res.status(200).json({
            status: "LOCKED",
            message: `🔒 Guest trial limits exceeded for ${mode} Mode (Max 2 trials). Please register to continue.`
          });
        }
      } else {
        // 2. Registered User Trial Checks
        userId = userPayload.id;
        const user = await UserRepository.findById(userId);
        if (!user) {
          return res.status(404).json({ status: "ERROR", message: "User not found" });
        }

        isPremium = user.is_paid;

        if (!isPremium) {
          if (mode === "SIMPLE" && user.simple_trial_used >= 3) {
            return res.status(200).json({
              status: "LOCKED",
              message: "🔒 Simple Mode trial limits exceeded (Max 3 trials). Please upgrade to Premium."
            });
          }
          if (mode === "DYNAMIC" && user.dynamic_trial_used >= 2) {
            return res.status(200).json({
              status: "LOCKED",
              message: "🔒 Dynamic Mode trial limits exceeded (Max 2 trials). Please upgrade to Premium."
            });
          }
        }
      }

      // 3. Perform Calculations (READ ONLY IMMUTABLE WAGE ENGINE)
      const validationResult = validateWages({
        components,
        mode,
        overtimeHours,
        overtimeRate
      });

      // 4. Save to validation_history
      const historyRow = await ValidationRepository.createValidationHistory({
        user_id: userId,
        mode,
        components,
        status: validationResult.status,
        issues: validationResult.issues,
        suggestions: validationResult.suggestions,
        recommended_structure: validationResult.recommendedStructure || null,
        financial_impact: validationResult.financialImpact || null
      });

      // 5. Save technical validation logs
      const executionTime = Date.now() - startTime;
      await ValidationRepository.createValidationLog({
        validation_id: historyRow.id,
        user_id: userId,
        browser: client?.browser || null,
        device: client?.device || null,
        operating_system: client?.os || null,
        ip_address: clientIp,
        api_endpoint: "/api/validate",
        http_status: 200,
        execution_time: executionTime
      });

      // 6. Update user usage counters (if logged in)
      if (userId && userPayload) {
        // Increment total validations count
        await UserRepository.incrementValidationCount(userId);

        // If not premium, increment trial usage
        if (!isPremium) {
          const user = await UserRepository.findById(userId);
          if (user) {
            const currentTrials = mode === "SIMPLE" ? user.simple_trial_used : user.dynamic_trial_used;
            await UserRepository.updateTrialUsage(userId, mode, currentTrials + 1);
          }
        }

        // Audit Logging
        await AuditRepository.createAuditLog({
          user_id: userId,
          action: "VALIDATE",
          description: `User executed validation in ${mode} mode (Status: ${validationResult.status})`
        });
      }

      return res.status(200).json(validationResult);
    } catch (error) {
      console.error("Validation error:", error);
      
      // Log technical failure if validation fails
      const executionTime = Date.now() - startTime;
      await ValidationRepository.createValidationLog({
        validation_id: null,
        user_id: userPayload ? userPayload.id : null,
        browser: client?.browser || null,
        device: client?.device || null,
        operating_system: client?.os || null,
        ip_address: clientIp,
        api_endpoint: "/api/validate",
        http_status: 500,
        execution_time: executionTime
      });

      return res.status(500).json({ status: "ERROR", message: "Failed to process wage validation" });
    }
  }
};
