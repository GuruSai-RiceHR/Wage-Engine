import { Response } from "express";
import { UserRepository } from "../repositories/user.repository";
import { ValidationRepository } from "../repositories/validation.repository";
import { AuditRepository } from "../repositories/audit.repository";
import { LoginHistoryRepository } from "../repositories/login.repository";
import { CustomRequest } from "../middleware/authMiddleware";

export const AdminController = {
  // Check role middleware helper inside controller
  isAdmin(req: CustomRequest): boolean {
    return req.user?.role === "ADMIN";
  },

  async getDashboardStats(req: CustomRequest, res: Response) {
    if (!AdminController.isAdmin(req)) {
      return res.status(403).json({ status: "ERROR", message: "Forbidden: Admin access required" });
    }

    try {
      const stats = await ValidationRepository.getStatistics();
      const usersList = await UserRepository.getAllUsers({ limit: 1, offset: 0 });

      return res.status(200).json({
        status: "SUCCESS",
        stats: {
          ...stats,
          totalUsers: usersList.total
        }
      });
    } catch (error) {
      console.error("Failed to get dashboard stats:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  },

  async getUsers(req: CustomRequest, res: Response) {
    if (!AdminController.isAdmin(req)) {
      return res.status(403).json({ status: "ERROR", message: "Forbidden: Admin access required" });
    }

    try {
      const search = req.query.search as string | undefined;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const data = await UserRepository.getAllUsers({ search, limit, offset });
      return res.status(200).json({ status: "SUCCESS", data });
    } catch (error) {
      console.error("Failed to get users list:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  },

  async toggleSubscription(req: CustomRequest, res: Response) {
    if (!AdminController.isAdmin(req)) {
      return res.status(403).json({ status: "ERROR", message: "Forbidden: Admin access required" });
    }

    try {
      const targetUserId = parseInt(req.params.id);
      const { isPaid } = req.body;

      if (isNaN(targetUserId) || typeof isPaid !== "boolean") {
        return res.status(400).json({ status: "ERROR", message: "Invalid parameters" });
      }

      await UserRepository.upgradePaidStatus(targetUserId, isPaid);

      // Log audit
      await AuditRepository.createAuditLog({
        user_id: req.user!.id,
        action: "ADMIN_ACTION",
        description: `Admin updated subscription status of User ID ${targetUserId} to ${isPaid ? "PREMIUM" : "FREE"}`,
        metadata: { targetUserId, isPaid }
      });

      return res.status(200).json({ status: "SUCCESS", message: "User subscription status updated successfully" });
    } catch (error) {
      console.error("Failed to update user subscription:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  },

  async updateUserRole(req: CustomRequest, res: Response) {
    if (!AdminController.isAdmin(req)) {
      return res.status(403).json({ status: "ERROR", message: "Forbidden: Admin access required" });
    }

    try {
      const targetUserId = parseInt(req.params.id);
      const { role } = req.body;

      if (isNaN(targetUserId) || (role !== "USER" && role !== "ADMIN")) {
        return res.status(400).json({ status: "ERROR", message: "Invalid role specified" });
      }

      await UserRepository.updateUserRole(targetUserId, role);

      // Log audit
      await AuditRepository.createAuditLog({
        user_id: req.user!.id,
        action: "ADMIN_ACTION",
        description: `Admin changed role of User ID ${targetUserId} to ${role}`,
        metadata: { targetUserId, role }
      });

      return res.status(200).json({ status: "SUCCESS", message: "User role updated successfully" });
    } catch (error) {
      console.error("Failed to update user role:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  },

  async getValidationLogs(req: CustomRequest, res: Response) {
    if (!AdminController.isAdmin(req)) {
      return res.status(403).json({ status: "ERROR", message: "Forbidden: Admin access required" });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const data = await ValidationRepository.getValidationLogs({ limit, offset });
      return res.status(200).json({ status: "SUCCESS", data });
    } catch (error) {
      console.error("Failed to get validation logs:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  },

  async getAuditLogs(req: CustomRequest, res: Response) {
    if (!AdminController.isAdmin(req)) {
      return res.status(403).json({ status: "ERROR", message: "Forbidden: Admin access required" });
    }

    try {
      const action = req.query.action as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const data = await AuditRepository.getAuditLogs({ action, limit, offset });
      return res.status(200).json({ status: "SUCCESS", data });
    } catch (error) {
      console.error("Failed to get audit logs:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  },

  async getLoginHistory(req: CustomRequest, res: Response) {
    if (!AdminController.isAdmin(req)) {
      return res.status(403).json({ status: "ERROR", message: "Forbidden: Admin access required" });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const data = await LoginHistoryRepository.getLoginHistory({ limit, offset });
      return res.status(200).json({ status: "SUCCESS", data });
    } catch (error) {
      console.error("Failed to get login history:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  }
};
