import { env } from "./env";
import { getSettings } from "./settings";

const GAS_EMAIL_WEB_APP_URL = env.GOOGLE_APPS_SCRIPT_EMAIL_WEB_APP_URL;
const GAS_EMAIL_API_KEY = env.GOOGLE_APPS_SCRIPT_EMAIL_API_KEY;
const APP_URL = env.NEXT_PUBLIC_APP_URL;

function escapeHtml(value: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (c) => map[c]);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  // Account emails (passwords) are always sent, even if notifications are switched off.
  critical?: boolean;
}

async function sendEmail({
  to,
  subject,
  html,
  critical = false,
}: EmailOptions): Promise<boolean> {
  try {
    if (!critical && !(await getSettings()).emailNotifications) return true;

    if (!GAS_EMAIL_WEB_APP_URL || !GAS_EMAIL_API_KEY) {
      throw new Error("Google Apps Script email settings are not configured");
    }

    const response = await fetch(GAS_EMAIL_WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "sendEmail",
        data: {
          apiKey: GAS_EMAIL_API_KEY,
          to,
          subject,
          html,
        },
      }),
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

function credentialsEmail(heading: string, intro: string, userName: string, userEmail: string, password: string): string {
  return `
      <h2>${heading}</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>${intro}</p>
      <ul>
        <li><strong>Email:</strong> ${escapeHtml(userEmail)}</li>
        <li><strong>Temporary password:</strong> <code>${escapeHtml(password)}</code></li>
      </ul>
      <p>You will be asked to choose a new password the first time you sign in.</p>
      <a href="${APP_URL}/login" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:5px;">Sign In</a>
    `;
}

export async function sendWelcomeCredentialsEmail(
  userEmail: string,
  userName: string,
  password: string,
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    critical: true,
    subject: "Your ADSE Hub account",
    html: credentialsEmail("Welcome to ADSE Hub", "An account has been created for you.", userName, userEmail, password),
  });
}

export async function sendAccountReactivatedEmail(
  userEmail: string,
  userName: string,
  password: string,
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    critical: true,
    subject: "Your ADSE Hub account has been reactivated",
    html: credentialsEmail("Your account has been reactivated", "Your ADSE Hub account has been reactivated. Use these details to sign in:", userName, userEmail, password),
  });
}

export async function sendPasswordResetLinkEmail(
  userEmail: string,
  userName: string,
  token: string,
  validMinutes: number,
): Promise<boolean> {
  const link = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: userEmail,
    critical: true,
    subject: "Reset your ADSE Hub password",
    html: `
      <h2>Reset your password</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>We received a request to reset your password. Use the button below to choose a new one. The link works once and expires in ${validMinutes} minutes.</p>
      <a href="${link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:5px;">Choose a new password</a>
      <p>If you didn't ask for this, ignore this email. Your current password still works.</p>
    `,
  });
}

export async function sendRequestApprovedEmail(
  userEmail: string,
  userName: string,
  requestTitle: string,
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: `Request Approved - ${requestTitle}`,
    html: `
      <h2>Request Approved</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your media request has been approved and a task has been created:</p>
      <ul>
        <li><strong>Request:</strong> ${escapeHtml(requestTitle)}</li>
      </ul>
      <p>A coordinator will assign this task to a team member shortly.</p>
      <a href="${APP_URL}/requests" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:5px;">View Requests</a>
    `,
  });
}

export async function sendRequestRejectedEmail(
  userEmail: string,
  userName: string,
  requestTitle: string,
  reason?: string,
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: `Request Rejected - ${requestTitle}`,
    html: `
      <h2>Request Rejected</h2>
      <p>Hi ${escapeHtml(userName)},</p>
      <p>Your media request has been rejected:</p>
      <ul>
        <li><strong>Request:</strong> ${escapeHtml(requestTitle)}</li>
        ${reason ? `<li><strong>Reason:</strong> ${escapeHtml(reason)}</li>` : ''}
      </ul>
      <p>Please contact a coordinator if you have questions.</p>
      <a href="${APP_URL}/requests" style="display:inline-block;padding:10px 20px;background:#dc2626;color:white;text-decoration:none;border-radius:5px;">View Requests</a>
    `,
  });
}

export async function sendTaskAssignedEmail(
  teamMemberEmail: string,
  teamMemberName: string,
  taskTitle: string,
  taskDescription: string,
  deadline: string,
  priority: string,
): Promise<boolean> {
  return sendEmail({
    to: teamMemberEmail,
    subject: `New Task Assigned - ${taskTitle}`,
    html: `
      <h2>New Task Assigned</h2>
      <p>Hi ${escapeHtml(teamMemberName)},</p>
      <p>You have been assigned a new task:</p>
      <ul>
        <li><strong>Title:</strong> ${escapeHtml(taskTitle)}</li>
        <li><strong>Description:</strong> ${escapeHtml(taskDescription || "No description")}</li>
        <li><strong>Priority:</strong> ${escapeHtml(priority)}</li>
        <li><strong>Deadline:</strong> ${escapeHtml(deadline)}</li>
      </ul>
      <a href="${APP_URL}/tasks" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:5px;">View Task</a>
    `,
  });
}

export async function sendDeadlineReminderEmail(
  teamMemberEmail: string,
  teamMemberName: string,
  taskTitle: string,
  deadline: string,
  daysRemaining: number,
): Promise<boolean> {
  const dayText = daysRemaining === 1 ? "tomorrow" : `in ${daysRemaining} days`;
  return sendEmail({
    to: teamMemberEmail,
    subject: `Reminder: Task Due ${dayText} - ${taskTitle}`,
    html: `
      <h2>Task Deadline Reminder</h2>
      <p>Hi ${escapeHtml(teamMemberName)},</p>
      <p>This is a reminder that your task is due ${dayText}:</p>
      <ul>
        <li><strong>Title:</strong> ${escapeHtml(taskTitle)}</li>
        <li><strong>Deadline:</strong> ${escapeHtml(deadline)}</li>
        <li><strong>Days Remaining:</strong> ${daysRemaining}</li>
      </ul>
      <a href="${APP_URL}/tasks" style="display:inline-block;padding:10px 20px;background:#ea580c;color:white;text-decoration:none;border-radius:5px;">View Task</a>
    `,
  });
}

export async function sendTaskOverdueEmail(
  teamMemberEmail: string,
  teamMemberName: string,
  taskTitle: string,
  deadline: string,
  daysOverdue: number,
  coordinatorEmail?: string,
): Promise<boolean> {
  const results = await Promise.all([
    sendEmail({
      to: teamMemberEmail,
      subject: `OVERDUE: Task Past Deadline - ${taskTitle}`,
      html: `
        <h2>Task Overdue Alert</h2>
        <p>Hi ${escapeHtml(teamMemberName)},</p>
        <p>The following task is now overdue:</p>
        <ul>
          <li><strong>Title:</strong> ${escapeHtml(taskTitle)}</li>
          <li><strong>Original Deadline:</strong> ${escapeHtml(deadline)}</li>
          <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
        </ul>
        <p>Please complete this task immediately or contact the coordinator.</p>
        <a href="${APP_URL}/tasks" style="display:inline-block;padding:10px 20px;background:#dc2626;color:white;text-decoration:none;border-radius:5px;">View Task</a>
      `,
    }),
    coordinatorEmail
      ? sendEmail({
          to: coordinatorEmail,
          subject: `OVERDUE Alert: ${taskTitle}`,
          html: `
            <h2>Task Overdue Alert</h2>
            <p>A task is now overdue:</p>
            <ul>
              <li><strong>Title:</strong> ${escapeHtml(taskTitle)}</li>
              <li><strong>Assigned to:</strong> ${escapeHtml(teamMemberName)}</li>
              <li><strong>Days Overdue:</strong> ${daysOverdue}</li>
            </ul>
            <a href="${APP_URL}/tasks" style="display:inline-block;padding:10px 20px;background:#dc2626;color:white;text-decoration:none;border-radius:5px;">View Task</a>
          `,
        })
      : Promise.resolve(true),
  ]);
  return results.every((r) => r);
}

export async function sendTaskCompletedEmail(
  requestorEmail: string,
  requestorName: string,
  taskTitle: string,
  completedByName: string,
): Promise<boolean> {
  return sendEmail({
    to: requestorEmail,
    subject: `Task Completed - ${taskTitle}`,
    html: `
      <h2>Task Completed</h2>
      <p>Hi ${escapeHtml(requestorName)},</p>
      <p>Your requested task has been completed:</p>
      <ul>
        <li><strong>Title:</strong> ${escapeHtml(taskTitle)}</li>
        <li><strong>Completed by:</strong> ${escapeHtml(completedByName)}</li>
        <li><strong>Completed on:</strong> ${new Date().toLocaleDateString()}</li>
      </ul>
      <a href="${APP_URL}/tasks" style="display:inline-block;padding:10px 20px;background:#16a34a;color:white;text-decoration:none;border-radius:5px;">View Task</a>
    `,
  });
}
