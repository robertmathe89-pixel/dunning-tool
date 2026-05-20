/**
 * Email templates for the Dunning Tool failed-payment recovery sequence.
 *
 * Each template returns `{ subject, body }` where `body` is an HTML email.
 * Variables use `{{variable}}` syntax and are replaced at render time.
 *
 * Tone: personal, founder-to-customer. No corporate jargon.
 */

/** Simple template renderer — replaces `{{key}}` with values, falls back to defaults. */
function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
  fallbacks: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = variables[key];
    if (value === undefined || value === null || value === "") {
      return fallbacks[key] ?? `{{${key}}}`;
    }
    return String(value);
  });
}

/** Shared fallback defaults used across all templates. */
const sharedFallbacks = {
  customerName: "there",
  productName: "your subscription",
  companyName: "our service",
  updateLink: "#",
  founderName: "The Team",
  websiteUrl: "#",
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Email 1 — Day 1: Initial friendly nudge                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const email1Template = `
<p>Hey {{customerName}},</p>

<p>Looks like your payment for <strong>{{productName}}</strong> didn't go through. No worries — this happens.</p>

<p>Most of the time it's just an expired card or a bank being overly cautious. The good news? It takes about 30 seconds to fix.</p>

<p><a href="{{updateLink}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Update billing info</a></p>

<p>If you run into any issues, just reply to this email. I read every one.</p>

<p>Talk soon,<br>{{founderName}}</p>
`;

/**
 * Day 1 initial email — friendly, low-pressure.
 *
 * @param customerName  First name of the customer
 * @param productName   Name of the product/subscription
 * @param companyName   Company or product name
 * @param updateLink    URL to update billing information
 * @param founderName   Name of the founder sending the email
 */
export function email1Initial(
  customerName?: string,
  productName?: string,
  companyName?: string,
  updateLink?: string,
  founderName?: string
): { subject: string; body: string } {
  const vars = { customerName, productName, companyName, updateLink, founderName };
  const body = renderTemplate(email1Template, vars, sharedFallbacks);

  return {
    subject: renderTemplate(`Quick fix needed for your {{productName}} account`, vars, sharedFallbacks),
    body,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Email 2 — Day 3: Gentle reminder                                          */
/* ────────────────────────────────────────────────────────────────────────── */

const email2Template = `
<p>Hey {{customerName}},</p>

<p>Just a quick heads-up — your {{productName}} subscription is still on hold because the last payment didn't go through.</p>

<p>You've got <strong>{{gracePeriodDays}} days</strong> of grace left, so no rush. But if the payment fails after that, we'll have to pause your account and you'll lose access to everything.</p>

<p>I'd hate for that to happen. Updating your card takes less than a minute:</p>

<p><a href="{{updateLink}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Update billing info</a></p>

<p>Let me know if something else is going on — happy to help.</p>

<p>Cheers,<br>{{founderName}}</p>
`;

/**
 * Day 3 reminder email — adds gentle urgency with grace period.
 *
 * @param customerName     First name of the customer
 * @param productName      Name of the product/subscription
 * @param companyName      Company or product name
 * @param updateLink       URL to update billing information
 * @param founderName      Name of the founder sending the email
 * @param gracePeriodDays  Number of days remaining in grace period
 */
export function email2Reminder(
  customerName?: string,
  productName?: string,
  companyName?: string,
  updateLink?: string,
  founderName?: string,
  gracePeriodDays?: number
): { subject: string; body: string } {
  const vars = {
    customerName,
    productName,
    companyName,
    updateLink,
    founderName,
    gracePeriodDays: gracePeriodDays ?? 7,
  };

  return {
    subject: renderTemplate(`Your {{productName}} account — {{gracePeriodDays}} days left`, vars, {
      ...sharedFallbacks,
      gracePeriodDays: "7",
    }),
    body: renderTemplate(email2Template, vars, {
      ...sharedFallbacks,
      gracePeriodDays: "7",
    }),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Email 3 — Day 7: Urgency — account at risk                                */
/* ────────────────────────────────────────────────────────────────────────── */

const email3Template = `
<p>Hey {{customerName}},</p>

<p>I wanted to reach out personally because your {{productName}} account is about to be paused.</p>

<p>We've tried charging your card a few times now and it's still not going through. I know life gets busy and these things slip through the cracks — but I also don't want you to lose access to everything you've built with us.</p>

<p><strong>This is the last reminder before we have to suspend your account.</strong></p>

<p>If you want to keep things running, here's the link to update your billing:</p>

<p><a href="{{updateLink}}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Update billing info now</a></p>

<p>If you're thinking about canceling, I get it. Just reply and let me know what's up — no hard feelings, and no automated "please don't go" bots. I'll read it myself.</p>

<p>{{founderName}}</p>
`;

/**
 * Day 7 urgency email — account suspension warning.
 *
 * @param customerName  First name of the customer
 * @param productName   Name of the product/subscription
 * @param companyName   Company or product name
 * @param updateLink    URL to update billing information
 * @param founderName   Name of the founder sending the email
 */
export function email3Urgency(
  customerName?: string,
  productName?: string,
  companyName?: string,
  updateLink?: string,
  founderName?: string
): { subject: string; body: string } {
  const vars = { customerName, productName, companyName, updateLink, founderName };

  return {
    subject: renderTemplate(`Last call — your {{productName}} account will be paused soon`, vars, sharedFallbacks),
    body: renderTemplate(email3Template, vars, sharedFallbacks),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Email 4 — Day 14: Final notice — account suspended                        */
/* ────────────────────────────────────────────────────────────────────────── */

const email4Template = `
<p>Hey {{customerName}},</p>

<p>Your {{productName}} account has been paused because we couldn't process payment after multiple attempts.</p>

<p>I'm sorry to see you go. If this was just a card issue and you want to come back, you can reactivate anytime at the link below. Everything will be exactly as you left it.</p>

<p><a href="{{websiteUrl}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reactivate my account</a></p>

<p>If there's anything we could have done better, I'd genuinely love to hear it. Just reply to this email.</p>

<p>Thanks for being a customer. Hope our paths cross again.</p>

<p>{{founderName}}</p>
`;

/**
 * Day 14 final email — account suspended, offboarding tone.
 *
 * @param customerName  First name of the customer
 * @param productName   Name of the product/subscription
 * @param companyName   Company or product name
 * @param founderName   Name of the founder sending the email
 * @param websiteUrl    URL to reactivate the account
 */
export function email4Final(
  customerName?: string,
  productName?: string,
  companyName?: string,
  founderName?: string,
  websiteUrl?: string
): { subject: string; body: string } {
  const vars = { customerName, productName, companyName, founderName, websiteUrl };

  return {
    subject: renderTemplate(`Your {{productName}} account has been paused`, vars, sharedFallbacks),
    body: renderTemplate(email4Template, vars, sharedFallbacks),
  };
}
