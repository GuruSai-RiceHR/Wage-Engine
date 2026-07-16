import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ricehr_secret_key_2024_typescript";

export interface DecodedToken {
  id: number;
  email: string;
  role: "USER" | "ADMIN";
  isPaid: boolean;
}

export interface CustomRequest extends Request {
  user?: DecodedToken;
  clientInfo?: {
    browser: string;
    device: string;
    os: string;
    ip: string;
  };
}

export const authMiddleware = (req: CustomRequest, res: Response, next: NextFunction) => {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7);
  }
  if (!token) {
    res.status(401).json({ status: "ERROR", message: "No token provided" });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ status: "ERROR", message: "Invalid or expired token" });
    return;
  }
};

export const optionalAuth = (req: CustomRequest, _res: Response, next: NextFunction) => {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7);
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      req.user = decoded;
    } catch {
      req.user = undefined;
    }
  } else {
    req.user = undefined;
  }
  next();
};

export const clientInfoMiddleware = (req: CustomRequest, _res: Response, next: NextFunction) => {
  const ua = req.headers["user-agent"] || "";
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let device = "Desktop";

  // Simple, elegant User Agent parsing
  if (ua.includes("Firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("Chrome/") && !ua.includes("Chromium/")) {
    browser = "Chrome";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
  } else if (ua.includes("MSIE ") || ua.includes("Trident/")) {
    browser = "Internet Explorer";
  }

  if (ua.includes("Windows NT")) {
    os = "Windows";
  } else if (ua.includes("Macintosh")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
  }

  if (ua.includes("Mobi") || ua.includes("Android") || ua.includes("iPhone")) {
    device = "Mobile";
  } else if (ua.includes("Tablet") || ua.includes("iPad")) {
    device = "Tablet";
  }

  // Get client IP address
  let ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  req.clientInfo = { browser, device, os, ip };
  next();
};
