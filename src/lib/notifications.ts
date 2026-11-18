import "server-only";
import { appUrl, emailTemplate, sendEmail } from "@/lib/email";

// Every e-mail the PMS sends, in one place. Called from server actions only.

type Person = { full_name: string; email: string };

export function notifyManagerGoalsSubmitted(manager: Person, employee: Person & { id: string }, cycleName: string) {
  return sendEmail({
    to: manager.email,
    subject: `${employee.full_name} submitted goals for approval`,
    html: emailTemplate({
      heading: "Goals waiting for your approval",
      lines: [
        `Hi ${manager.full_name},`,
        `${employee.full_name} has submitted their goals for the ${cycleName} cycle. Please approve them or send them back with a comment.`,
      ],
      cta: { label: "Review goals", href: appUrl(`/team/${employee.id}`) },
    }),
  });
}

export function notifyEmployeeGoalsDecided(employee: Person, cycleName: string, sentBack: number) {
  return sendEmail({
    to: employee.email,
    subject: sentBack ? "Some of your goals were sent back" : "Your goals were approved",
    html: emailTemplate({
      heading: sentBack ? "Your manager sent goals back" : "Your goals are approved",
      lines: [
        `Hi ${employee.full_name},`,
        sentBack
          ? `${sentBack} of your goals for ${cycleName} need changes. Read your manager's comment, update the goal and submit again.`
          : `All your goals for ${cycleName} are approved. You can complete your self-appraisal when you are ready.`,
      ],
      cta: { label: "Open my goals", href: appUrl("/goals") },
    }),
  });
}

/** The one e-mail the lab manual requires: self-appraisal submitted → manager. */
export function notifyManagerSelfAppraisal(manager: Person, employee: Person & { id: string }, cycleName: string) {
  return sendEmail({
    to: manager.email,
    subject: `${employee.full_name} submitted their self-appraisal`,
    html: emailTemplate({
      heading: "A self-appraisal is ready for your review",
      lines: [
        `Hi ${manager.full_name},`,
        `${employee.full_name} has submitted their self-appraisal for the ${cycleName} cycle.`,
        "Open the review to see their ratings and comments side by side with your own.",
      ],
      cta: { label: "Write the review", href: appUrl(`/team/${employee.id}`) },
    }),
  });
}

export function notifyEmployeeReviewCompleted(employee: Person, cycleName: string, reviewId: string) {
  return sendEmail({
    to: employee.email,
    subject: `Your ${cycleName} review is complete`,
    html: emailTemplate({
      heading: "Your performance review is complete",
      lines: [`Hi ${employee.full_name},`, `Your manager has completed your ${cycleName} review. You can now see their ratings and comments.`],
      cta: { label: "View my review", href: appUrl(`/reviews/${reviewId}`) },
    }),
  });
}
