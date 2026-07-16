import { Router, Response } from "express";
import { AuthController } from "../controllers/auth.controller";
import { ValidateController } from "../controllers/validate.controller";
import { AdminController } from "../controllers/admin.controller";
import { UserRepository } from "../repositories/user.repository";
import { ValidationRepository } from "../repositories/validation.repository";
import { authMiddleware, optionalAuth, clientInfoMiddleware, CustomRequest } from "../middleware/authMiddleware";

const router = Router();

// ==================== PUBLIC ENDPOINTS ====================
router.get("/health", async (_req, res: Response) => {
  try {
    const usersCount = (await UserRepository.getAllUsers({ limit: 1, offset: 0 })).total;
    return res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      usersCount
    });
  } catch (error) {
    return res.status(500).json({ status: "ERROR", message: "Database connection failed" });
  }
});

router.post("/register", clientInfoMiddleware, AuthController.register);
router.post("/login", clientInfoMiddleware, AuthController.login);

// ==================== USER ENDPOINTS ====================
router.post("/upgrade", authMiddleware, AuthController.upgrade);
router.post("/validate", optionalAuth, clientInfoMiddleware, ValidateController.validate);

router.get("/user/:email", authMiddleware, async (req: CustomRequest, res: Response) => {
  try {
    const email = req.params.email;
    
    // Authorization check: users can only fetch their own details, unless they are admin
    if (req.user?.role !== "ADMIN" && req.user?.email !== email) {
      return res.status(403).json({ status: "ERROR", message: "Forbidden: Access denied" });
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(404).json({ status: "ERROR", message: "User not found" });
    }

    // Fetch user validation history
    const history = await ValidationRepository.getHistoryByUserId(user.id);

    // Strip password hash for security
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      status: "SUCCESS",
      user: safeUser,
      history
    });
  } catch (error) {
    console.error("Failed to fetch user details:", error);
    return res.status(500).json({ status: "ERROR", message: "Internal server error" });
  }
});

// ==================== ADMIN ENDPOINTS ====================
router.get("/admin/stats", authMiddleware, AdminController.getDashboardStats);
router.get("/admin/users", authMiddleware, AdminController.getUsers);
router.post("/admin/users/:id/role", authMiddleware, AdminController.updateUserRole);
router.post("/admin/users/:id/subscription", authMiddleware, AdminController.toggleSubscription);
router.get("/admin/validation-logs", authMiddleware, AdminController.getValidationLogs);
router.get("/admin/audit-logs", authMiddleware, AdminController.getAuditLogs);
router.get("/admin/login-history", authMiddleware, AdminController.getLoginHistory);

export default router;
