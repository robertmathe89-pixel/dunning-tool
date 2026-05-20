/**
 * Email module — exports all email service functions and templates.
 *
 * Usage:
 *   import { sendEmail, email1Initial, logEmailSent } from "@/lib/email";
 */

export {
  sendEmail,
  validateSmtpConfig,
  logEmailSent,
} from "./service";

export {
  email1Initial,
  email2Reminder,
  email3Urgency,
  email4Final,
} from "./templates";
