export function buildPasswordResetEmail(args: { resetUrl: string; expiresMinutes: number }) {
  const subject = "Reset your Uppearance HRMS password";
  const text =
    `Hello,\n\n` +
    `We received a request to reset the password for your Uppearance HRMS account.\n\n` +
    `Open the link below within ${args.expiresMinutes} minutes to choose a new password:\n\n` +
    `${args.resetUrl}\n\n` +
    `If you did not request a reset, you can ignore this message. Your password will stay the same.\n\n` +
    `For security, never forward this email or share the link with anyone.\n\n` +
    `— Uppearance HRMS\n`;
  return { subject, text };
}
