import { z } from "zod";
import { normalizeFullName } from "./util";

// regex helpers
const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reSeat  = /^B\d{11}$/;           // B + 11 digits
const rePass6 = /^.{6,}$/;             // ≥ 6 chars

export const LoginSchema = z.object({
  email: z.string().trim().regex(reEmail, "Enter a valid email"),
  password: z.string().regex(rePass6, "Password must be at least 6 characters"),
});

export const SignupSchema = z.object({
  fullName: z.string().min(2, "Full name is required").transform(normalizeFullName),
  email: z.string().trim().regex(reEmail, "Enter a valid email"),
  password: z.string().regex(rePass6, "Password must be at least 6 characters"),
});

export const JoinClassSchema = z.object({
  name: z.string().min(2, "Full name is required").transform(normalizeFullName),
  seat: z.string().toUpperCase().regex(reSeat, "Seat No must be B followed by 11 digits (e.g., B23110006177)"),
  email: z.string().trim().regex(reEmail, "Enter a valid email"),
  classId: z.string().min(1),
});

export const VerifySchema = z.object({
  seat: z.string().toUpperCase().regex(reSeat, "Seat No must be B followed by 11 digits (e.g., B23110006177)."),
  email: z.string().trim().regex(reEmail, "Enter a valid email"),
  pass: z.string().regex(rePass6, "Password must be at least 6 characters"),
});
