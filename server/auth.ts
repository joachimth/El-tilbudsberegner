import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db, brugere } from "./db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    interface User {
      id: number;
      brugernavn: string;
      rolle: "montør" | "admin";
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, buf);
}

export function setupPassport() {
  passport.use(
    new LocalStrategy(
      { usernameField: "brugernavn", passwordField: "password" },
      async (brugernavn, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(brugere)
            .where(eq(brugere.brugernavn, brugernavn));
          if (!user || !(await comparePasswords(password, user.passwordHash))) {
            return done(null, false, { message: "Forkert brugernavn eller adgangskode" });
          }
          return done(null, { id: user.id, brugernavn: user.brugernavn, rolle: user.rolle });
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select({ id: brugere.id, brugernavn: brugere.brugernavn, rolle: brugere.rolle })
        .from(brugere)
        .where(eq(brugere.id, id));
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Ikke autoriseret. Log ind for at fortsætte." });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Ikke autoriseret." });
  }
  if (req.user?.rolle !== "admin") {
    return res.status(403).json({ error: "Ingen adgang. Admin-rettigheder kræves." });
  }
  next();
}
