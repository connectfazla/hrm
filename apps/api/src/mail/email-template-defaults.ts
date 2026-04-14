/** Default HR notification templates. Placeholders use {{snake_case}}. Keep apps/web/src/lib/email-template-defaults.ts in sync. */

export type EmailTemplateEntry = { subject: string; body: string };

export const DEFAULT_EMAIL_TEMPLATE_IDS = [
  "leave_approved",
  "leave_rejected",
  "salary_changed",
  "document_expiry",
  "welcome_employee",
] as const;

export type EmailTemplateId = (typeof DEFAULT_EMAIL_TEMPLATE_IDS)[number];

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateId, EmailTemplateEntry> = {
  leave_approved: {
    subject: "Your leave request was approved — {{leave_type}}",
    body: `Dear {{employee_name}},

Good news: your {{leave_type}} leave from {{start_date}} through {{end_date}} has been approved.

{{admin_comment}}

If anything looks incorrect, reply to this email or contact HR.

Kind regards,
HR Team`,
  },
  leave_rejected: {
    subject: "Update on your leave request — {{leave_type}}",
    body: `Dear {{employee_name}},

Your {{leave_type}} leave from {{start_date}} through {{end_date}} was not approved on this occasion.

{{admin_comment}}

Please contact HR if you would like to discuss alternatives or submit a revised request.

Kind regards,
HR Team`,
  },
  salary_changed: {
    subject: "Your compensation details were updated",
    body: `Dear {{employee_name}},

Your salary package has been updated. The new total package amount reflected in the system is {{salary_amount}}.

Please log in to the HR portal to review your payslip and compensation breakdown. If you have questions, contact HR.

Kind regards,
HR Team`,
  },
  document_expiry: {
    subject: "Action needed: document approaching expiry — {{document_name}}",
    body: `Dear {{employee_name}},

This is a reminder that your document "{{document_name}}" is due to expire on {{expiry_date}}.

Please upload a renewed copy through the HR portal as soon as possible so your records stay compliant.

Kind regards,
HR Team`,
  },
  welcome_employee: {
    subject: "Welcome to the team — your HR portal account is ready",
    body: `Dear {{employee_name}},

Welcome aboard. An account has been created for you in our HR system.

You can sign in with the work email address on file to complete your profile, review policies, and manage leave and documents.

If you did not expect this message, please contact HR.

Kind regards,
HR Team`,
  },
};

export function mergeEmailTemplates(stored: unknown): Record<EmailTemplateId, EmailTemplateEntry> {
  const merged: Record<string, EmailTemplateEntry> = {};
  const raw =
    stored && typeof stored === "object" && stored !== null ? (stored as Record<string, unknown>) : {};

  for (const id of DEFAULT_EMAIL_TEMPLATE_IDS) {
    const def = DEFAULT_EMAIL_TEMPLATES[id];
    const row = raw[id];
    let subject = def.subject;
    let body = def.body;
    if (row && typeof row === "object" && row !== null) {
      const e = row as Record<string, unknown>;
      if (typeof e.subject === "string" && e.subject.trim() !== "") subject = e.subject;
      if (typeof e.body === "string" && e.body.trim() !== "") body = e.body;
    }
    merged[id] = { subject, body };
  }
  return merged as Record<EmailTemplateId, EmailTemplateEntry>;
}

/** Replaces {{key}} placeholders; unknown keys are left unchanged. */
export function applyEmailTemplatePlaceholders(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
