import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { AuditRepository } from "../repositories/audit.repository";
import { LoginHistoryRepository } from "../repositories/login.repository";
import { CustomRequest } from "../middleware/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET || "ricehr_secret_key_2024_typescript";

export const AuthController = {
  async register(req: CustomRequest, res: Response) {
    try {
      const { username, full_name, email, phone, company_name, password } = req.body;

      if (!username || !full_name || !email || !password) {
        return res.status(400).json({ status: "ERROR", message: "Required fields missing" });
      }

      // Check if user already exists
      const existingEmail = await UserRepository.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ status: "ERROR", message: "Email is already registered" });
      }

      const existingUser = await UserRepository.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ status: "ERROR", message: "Username is already taken" });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Determine if this is the first user overall (if so, make them ADMIN)
      const isFirstUser = (await UserRepository.getAllUsers({ limit: 1, offset: 0 })).total === 0;
      const role = isFirstUser ? "ADMIN" : "USER";

      // Create user
      const user = await UserRepository.createUser({
        username,
        full_name,
        email,
        phone,
        company_name,
        password_hash,
        role
      });

      // Audit Log
      await AuditRepository.createAuditLog({
        user_id: user.id,
        action: "REGISTER",
        description: `User registered successfully with email ${email}. Assigned role: ${role}`,
        metadata: { role }
      });

      return res.status(201).json({ status: "SUCCESS", message: "Registration successful" });
    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  },

  async login(req: CustomRequest, res: Response) {
    const { email, password } = req.body;
    const client = req.clientInfo;

    if (!email || !password) {
      return res.status(400).json({ status: "ERROR", message: "Email and password are required" });
    }

    try {
      const user = await UserRepository.findByEmail(email);
      
      if (!user) {
        // Log failed login
        await LoginHistoryRepository.createLoginHistory({
          user_id: null,
          login_status: "FAILED",
          browser: client?.browser || null,
          device: client?.device || null,
          operating_system: client?.os || null,
          ip_address: client?.ip || null
        });

        return res.status(400).json({ status: "ERROR", message: "Invalid email or password" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        // Log failed login
        await LoginHistoryRepository.createLoginHistory({
          user_id: user.id,
          login_status: "FAILED",
          browser: client?.browser || null,
          device: client?.device || null,
          operating_system: client?.os || null,
          ip_address: client?.ip || null
        });

        return res.status(400).json({ status: "ERROR", message: "Invalid email or password" });
      }

      // Success logic
      await UserRepository.updateLoginTimes(user.id);

      // Log success in history
      await LoginHistoryRepository.createLoginHistory({
        user_id: user.id,
        login_status: "SUCCESS",
        browser: client?.browser || null,
        device: client?.device || null,
        operating_system: client?.os || null,
        ip_address: client?.ip || null
      });

      // Audit Log
      await AuditRepository.createAuditLog({
        user_id: user.id,
        action: "LOGIN",
        description: `User logged in from IP ${client?.ip}`
      });

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          isPaid: user.is_paid
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        status: "SUCCESS",
        token,
        isPaid: user.is_paid,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          validationCount: user.validation_count
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  },

  async upgrade(req: CustomRequest, res: Response) {
    try {
      const { paymentCode } = req.body;
      const userPayload = req.user;

      if (!userPayload) {
        return res.status(401).json({ status: "ERROR", message: "Unauthorized" });
      }

      if (paymentCode !== "123456789") {
        return res.status(400).json({ status: "ERROR", message: "Invalid payment code" });
      }

      const user = await UserRepository.findById(userPayload.id);
      if (!user) {
        return res.status(404).json({ status: "ERROR", message: "User not found" });
      }

      // Upgrade status in db
      await UserRepository.upgradePaidStatus(user.id, true);

      // Log audit
      await AuditRepository.createAuditLog({
        user_id: user.id,
        action: "UPGRADE",
        description: "User upgraded account to Premium using code 123456789"
      });

      // Issue new token with isPaid = true
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          isPaid: true
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        status: "UPGRADED",
        token,
        isPaid: true,
        message: "Premium subscription activated successfully!"
      });
    } catch (error: any) {
      console.error("Upgrade error:", error);
      return res.status(500).json({ status: "ERROR", message: "Internal server error" });
    }
  }
};
