const GAS_EMAIL_WEB_APP_URL = process.env.GOOGLE_APPS_SCRIPT_EMAIL_WEB_APP_URL;
const GAS_EMAIL_API_KEY = process.env.GOOGLE_APPS_SCRIPT_EMAIL_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({
  to,
  subject,
  html,
}: EmailOptions): Promise<boolean> {
  try {
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

export async function sendRegistrationPendingEmail(
  coordinatorEmail: string,
  userName: string,
  userEmail: string,
  role: string,
): Promise<boolean> {
  return sendEmail({
    to: coordinatorEmail,
    subject: `New Registration Request - ${userName}`,
    html: `
      <h2>New Registration Request</h2>
      <p>A new user has requested access to ADSE Hub:</p>
      <ul>
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
        <li><strong>Role:</strong> ${role}</li>
      </ul>
      <p>Please login to approve or reject this registration.</p>
      <a href="${APP_URL}/users" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:5px;">Go to User Management</a>
    `,
  });
}

export async function sendAccountApprovedEmail(
  userEmail: string,
  userName: string,
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: "Welcome to ADSE Hub!",
    html: `
      <h2>Welcome to ADSE Hub!</h2>
      <p>Hi ${userName},</p>
      <p>Your account has been approved! You can now access ADSE Hub.</p>
      <a href="${APP_URL}/login" style="display:inline-block;padding:10px 20px;background:#16a34a;color:white;text-decoration:none;border-radius:5px;">Login Now</a>
      <p>We look forward to working with you!</p>
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
      <p>Hi ${userName},</p>
      <p>Your media request has been approved and a task has been created:</p>
      <ul>
        <li><strong>Request:</strong> ${requestTitle}</li>
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
      <p>Hi ${userName},</p>
      <p>Your media request has been rejected:</p>
      <ul>
        <li><strong>Request:</strong> ${requestTitle}</li>
        ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
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
      <p>Hi ${teamMemberName},</p>
      <p>You have been assigned a new task:</p>
      <ul>
        <li><strong>Title:</strong> ${taskTitle}</li>
        <li><strong>Description:</strong> ${taskDescription || "No description"}</li>
        <li><strong>Priority:</strong> ${priority}</li>
        <li><strong>Deadline:</strong> ${deadline}</li>
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
      <p>Hi ${teamMemberName},</p>
      <p>This is a reminder that your task is due ${dayText}:</p>
      <ul>
        <li><strong>Title:</strong> ${taskTitle}</li>
        <li><strong>Deadline:</strong> ${deadline}</li>
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
        <p>Hi ${teamMemberName},</p>
        <p>The following task is now overdue:</p>
        <ul>
          <li><strong>Title:</strong> ${taskTitle}</li>
          <li><strong>Original Deadline:</strong> ${deadline}</li>
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
              <li><strong>Title:</strong> ${taskTitle}</li>
              <li><strong>Assigned to:</strong> ${teamMemberName}</li>
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
      <p>Hi ${requestorName},</p>
      <p>Your requested task has been completed:</p>
      <ul>
        <li><strong>Title:</strong> ${taskTitle}</li>
        <li><strong>Completed by:</strong> ${completedByName}</li>
        <li><strong>Completed on:</strong> ${new Date().toLocaleDateString()}</li>
      </ul>
      <a href="${APP_URL}/tasks" style="display:inline-block;padding:10px 20px;background:#16a34a;color:white;text-decoration:none;border-radius:5px;">View Task</a>
    `,
  });
}
