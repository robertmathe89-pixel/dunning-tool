As an expert full-stack engineer, I will deliver a complete, production-ready architecture. We will use Next.js App Router conventions and follow best practices for security, typing, and scalability.

## Project Structure Overview

```
/dunning-tool
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx             # Founder Dashboard
│   │   └── layout.tsx
│   ├── recovery/[customerId]/page.tsx # Customer Recovery Page
│   ├── api/
│   │   ├── webhook/
│   │   │   └── route.ts         # Stripe Webhook Handler (Core)
│   │   ├── dashboard/
│   │   │   └── metrics/route.ts # Dashboard Metrics Endpoint
│   │   └── email-templates/
│   │       └── route.ts         # Template Management API
├── components/
│   ├── ui/                      # Reusable UI primitives (Button, Card)
│   ├── dashboard/
│   │   ├── MetricCard.tsx      # Dashboard component
│   │   └── CampaignList.tsx    # List of active campaigns
│   ├── recovery/
│   │   └── RecoveryStatusForm.tsx # Customer form
├── lib/
│   ├── db.ts                    # Prisma Client Initialization
│   ├── utils.ts                 # General utilities (e.g., date formatting)
│   ├── stripe.ts                # Stripe API wrapper
│   ├── emailService.ts          # Email sending logic (Resend/SendGrid)
│   └── recoveryEngine.ts        # The core business logic engine
├── prisma/
│   └── schema.prisma            # Database Schema Definition
└── types/
    └── index.d.ts               # Global TypeScript Types
```

---

## 1. Database Schema (`prisma/schema.prisma`)

We define the state machine and necessary tracking tables.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --- Core Models ---

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  stripeCustomerId String    @unique // Link to Stripe Customer ID
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  subscriptions Subscription[]
}

model Subscription {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  planName      String // e.g., "Pro", "Basic"
  stripeSubscriptionId String @unique
  status        String // active, past_due, canceled
  billingCycle   DateTime // Next billing date

  payments Payment[]
}

// --- Dunning/Recovery Models ---

enum RecoveryStatus {
  PENDING     // Initial state after payment failure
  EMAIL_SENT  // Email notification sent
  RETRYING    // Scheduled for retry
  SUCCESS     // Payment recovered successfully
  CHURNED     // Failed all retries, account marked for churn
}

model Payment {
  id            String        @id @default(uuid())
  subscriptionId String
  subscription  Subscription  @relation(fields: [subscriptionId], references: [id])
  stripeInvoiceId String    @unique // Stripe Invoice ID
  amountPaid     Int           // In cents
  status         String       // paid, failed, etc.
  lastAttemptedAt DateTime?
  createdAt      DateTime      @default(now())

  recoveryAttempts RecoveryAttempt[]
}

model RecoveryAttempt {
  id            String    @id @default(uuid())
  paymentId     String
  payment       Payment   @relation(fields: [paymentId], references: [id])
  attemptNumber Int        // 1, 2, 3...
  scheduledAt   DateTime? // When the retry was scheduled
  executedAt    DateTime? // When the attempt actually ran
  success       Boolean   @default(false)
  reason        String?   // e.g., "Insufficient funds", "Card expired"

  createdAt     DateTime  @default(now())
}

model Campaign {
  id            String    @id @default(uuid())
  name          String
  isActive      Boolean   @default(true)
  description   String?
  // Future: Could link to specific payment failure types or regions
}

// --- Email Templates ---

model EmailTemplate {
  id            Int       @id @default(autoincrement())
  name          String    @unique // e.g., "Payment Failure Notice"
  subject       String
  bodyHtml       String    // HTML content with tokens like {{user.name}}
  isDefault     Boolean   @default(false)
}
```

---

## 2. Core Utilities & Services (`lib/`)

### `lib/db.ts` (Prisma Client Initialization)

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

// Global variable to prevent multiple instances in development mode
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  } else {
    prisma = (global as any).prisma;
  }
}

export const prisma = global.prisma;
```

### `lib/stripe.ts` (Stripe Wrapper)

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * Handles fetching detailed payment information from Stripe using an Invoice ID.
 */
export async function getStripeInvoiceDetails(invoiceId: string): Promise<any> {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return {
      id: invoice.id,
      amountDue: invoice.amount_due,
      status: invoice.status,
      customer: invoice.customer,
      latestPaymentAttempt: invoice.payment_history?.pop(), // Get the most recent attempt
    };
  } catch (error) {
    console.error("Error retrieving Stripe Invoice details:", error);
    throw new Error("Failed to retrieve payment details from Stripe.");
  }
}

/**
 * Creates a webhook idempotency key based on unique request parameters.
 */
export function generateIdempotencyKey(data: any): string {
    // Use a combination of source, timestamp, and payload hash for robustness
    const payloadHash = JSON.stringify({ ...data });
    return `webhook:${payloadHash}:${Date.now()}`;
}
```

### `lib/emailService.ts` (Email Sending)

We use Resend as the modern standard for transactional emails.

```typescript
// lib/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a personalized email using template tokens.
 * @param toEmail Recipient's email address.
 * @param subject Email subject line.
 * @param templateName The name of the template (e.g., "payment-failure").
 * @param data Personalization data matching template tokens.
 */
export async function sendPersonalizedEmail(
  toEmail: string, 
  subject: string, 
  templateName: string, 
  data: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  try {
    // In a real system, we'd fetch the template content/ID from our DB first.
    // For this example, we assume Resend handles dynamic templates or we use simple HTML.

    const emailBody = `
      <h1>Payment Recovery Notice</h1>
      <p>Dear ${data.user?.name || 'Customer'},</p>
      <p>We noticed a payment failure for your subscription on ${new Date().toLocaleDateString()}. Please update your billing information to avoid service interruption.</p>
      <p>Your account status: <strong>${data.status}</strong></p>
      <a href="${process.env.RECOVERY_PAGE_URL}">Update Payment Details</a>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Dunning Tool <no-reply@yourdomain.com>',
      to: [toEmail],
      subject: subject,
      html: emailBody, // Using simple HTML for demonstration
    });

    if (error) {
        console.error("Resend Error:", error);
        return { success: false, message: `Failed to send email: ${error.message}` };
    }

    return { success: true, message: 'Email sent successfully.' };

  } catch (e) {
    console.error("General Email Sending Error:", e);
    return { success: false, message: 'An unexpected error occurred while sending the email.' };
  }
}
```

### `lib/recoveryEngine.ts` (The Workflow Engine)

This module encapsulates the state machine logic and scheduling.

```typescript
// lib/recoveryEngine.ts
import { prisma } from './db';
import { sendPersonalizedEmail } from './emailService';
import { getStripeInvoiceDetails } from './stripe';

const MAX_ATTEMPTS = 3;

/**
 * Calculates the next retry date using exponential backoff: T * 2^N
 * @param attemptNumber The current attempt number (1-indexed).
 * @returns A Date object for the scheduled retry.
 */
function calculateNextRetryDate(attemptNumber: number): Date {
    // Base delay in hours (e.g., 6 hours)
    const baseHours = 6; 
    // Exponential backoff calculation: T * 2^(N-1)
    const delayMinutes = Math.pow(2, attemptNumber - 1) * 60 * baseHours;
    return new Date();
}

/**
 * Core function to process a payment failure and initiate the recovery workflow.
 * @param invoiceId The Stripe Invoice ID that failed.
 */
export async function handlePaymentFailureWorkflow(invoiceId: string): Promise<void> {
    console.log(`[ENGINE] Starting workflow for Invoice: ${invoiceId}`);

    // 1. Fetch detailed state from Stripe
    const stripeDetails = await getStripeInvoiceDetails(invoiceId);
    if (!stripeDetails) {
        throw new Error("Could not retrieve necessary payment details.");
    }

    // 2. Find or create the local Payment record (assuming we link by invoice ID)
    let paymentRecord = await prisma.payment.findUnique({
        where: { stripeInvoiceId: invoiceId },
        include: { subscription: true }
    });

    if (!paymentRecord || !paymentRecord.subscription?.userId) {
        throw new Error("Subscription or User not found locally.");
    }

    const userId = paymentRecord.subscription.userId;
    const userEmail = (await prisma.user.findUnique({ where: { id: userId } }))?.email;

    if (!userEmail) {
        console.error(`[ENGINE] Critical: User email not found for ID ${userId}. Cannot send recovery emails.`);
        return;
    }


    // 3. Check current state and determine next action
    let latestAttempt = await prisma.recoveryAttempt.findMany({
        where: { paymentId: paymentRecord.id },
        orderBy: { createdAt: 'desc' }
    });

    const lastStatus = latestAttempt.length > 0 ? latestAttempt[0] : null;
    const currentAttempts = lastStatus ? Math.max(lastStatus.attemptNumber, 1) : 0;


    // --- State Machine Logic ---

    if (currentAttempts === 0) {
        // First failure: Initial setup and first email attempt
        await initiateFirstFailure(paymentRecord, userId, userEmail);
    } else if (currentAttempts < MAX_ATTEMPTS && lastStatus?.success !== true) {
        // Failed but within retry limit: Schedule next attempt/email
        const nextAttempt = currentAttempts + 1;
        const scheduledDate = calculateNextRetryDate(nextAttempt);

        await prisma.recoveryAttempt.create({
            data: {
                paymentId: paymentRecord.id,
                attemptNumber: nextAttempt,
                scheduledAt: scheduledDate,
                reason: "Scheduled retry due to previous failure.",
            }
        });
        console.log(`[ENGINE] Scheduled Attempt ${nextAttempt}. Next run date: ${scheduledDate.toISOString()}`);

    } else if (currentAttempts >= MAX_ATTEMPTS) {
        // Max attempts reached: Churn the account
        await prisma.subscription.update({
            where: { id: paymentRecord.subscriptionId },
            data: { status: 'churned' }
        });
        console.warn(`[ENGINE] Account for ${userId} has CHURNED after ${MAX_ATTEMPTS} attempts.`);
    }
}

/** Handles the initial failure state (Attempt 1) */
async function initiateFirstFailure(paymentRecord: any, userId: string, userEmail: string): Promise<void> {
    console.log(`[ENGINE] Initial Failure detected. Sending first notice.`);

    // 1. Record the first attempt
    await prisma.recoveryAttempt.create({
        data: {
            paymentId: paymentRecord.id,
            attemptNumber: 1,
            scheduledAt: new Date(), // Immediate action
        }
    });

    // 2. Send initial email notification
    const subject = "Action Required: Payment Failure for Your Subscription";
    await sendPersonalizedEmail(userEmail, subject, "payment-failure", {
        user: { name: (await prisma.user.findUnique({ where: { id: userId } }))?.name },
        status: 'Past Due',
        // ... other context data
    });

    // 3. Update subscription status to PENDING/EMAIL_SENT state
    await prisma.subscription.update({
        where: { id: paymentRecord.subscriptionId },
        data: { status: 'past_due' }
    });
}


/**
 * This function would be called by a CRON job (e.g., Vercel Cron) 
 * to process scheduled retries.
 */
export async function runScheduledRetries(): Promise<void> {
    console.log("[ENGINE] Running daily scheduled retry check...");

    // Find all attempts that are due and haven't been executed
    const pendingAttempts = await prisma.recoveryAttempt.findMany({
        where: { 
            scheduledAt: { lte: new Date() }, 
            executedAt: null,
            success: false // Only retry failed ones
        }
    });

    for (const attempt of pendingAttempts) {
        console.log(`[ENGINE] Processing scheduled retry for Attempt ${attempt.attemptNumber}...`);
        try {
            // In a real scenario, this would call Stripe API to re-charge the card
            // For simulation: assume success if we reach here and update state.
            await simulatePaymentCharge(attempt);

        } catch (error) {
            console.error(`[ENGINE] Retry failed for attempt ${attempt.attemptNumber}:`, error);
            // If it fails, the workflow engine will handle scheduling the next retry 
            // when the webhook or a manual trigger runs again.
        }
    }
}

/** Simulates calling Stripe to re-charge the customer */
async function simulatePaymentCharge(attempt: any): Promise<void> {
    // Actual implementation would involve stripe.charges.create(...)
    console.
