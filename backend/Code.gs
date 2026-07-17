/**
 * Media Team Portal - Main Entry Point
 * Google Apps Script Backend
 */

// Configuration
const CONFIG = {
  SPREADSHEET_ID: "1B0vaxLdUqDgMbLJud73_EtsEghh3Tp28-8tVipn_qyo", // Add your Google Sheet ID here
  SHEETS: {
    USERS: "Users",
    REQUESTS: "Requests",
    TASKS: "Tasks",
    NOTIFICATIONS: "Notifications",
    SESSIONS: "Sessions",
  },
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  REMINDER_DAYS: [7, 3, 1],
};

/**
 * Check if configuration is valid
 */
function checkConfig() {
  if (!CONFIG.SPREADSHEET_ID) {
    return {
      success: false,
      error:
        "SPREADSHEET_ID is not configured. Please update the CONFIG object in Code.gs",
    };
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetNames = CONFIG.SHEETS;

    for (const [key, name] of Object.entries(sheetNames)) {
      const sheet = spreadsheet.getSheetByName(name);
      if (!sheet) {
        return {
          success: false,
          error: `Sheet "${name}" not found. Please create it in your spreadsheet.`,
        };
      }
    }

    return { success: true, message: "Configuration is valid" };
  } catch (error) {
    return {
      success: false,
      error: `Cannot access spreadsheet: ${error.message}`,
    };
  }
}

/**
 * Main GET handler - handles CORS and health checks
 */
function doGet(e) {
  // Handle CORS preflight
  if (e.parameter && e.parameter.cors === "true") {
    return ContentService.createTextOutput("").setMimeType(
      ContentService.MimeType.TEXT,
    );
  }

  // Return API info for GET requests
  return ContentService.createTextOutput(
    JSON.stringify({
      success: true,
      message: "Media Team Portal API",
      version: "1.0.0",
      usage: "Use POST requests with action parameter",
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main POST handler - API router
 */
function doPost(e) {
  try {
    // Handle both JSON and text/plain content types
    let request;
    const contents = e.postData.contents;

    try {
      request = JSON.parse(contents);
    } catch (parseError) {
      // If parsing fails, return error
      return jsonResponse({ success: false, error: "Invalid request format" });
    }

    const { action, data } = request;

    // Route to appropriate handler
    switch (action) {
      case "register":
        return jsonResponse(AuthService.register(data));
      case "login":
        return jsonResponse(AuthService.login(data));
      case "logout":
        return jsonResponse(AuthService.logout(data));
      case "getMe":
        return jsonResponse(AuthService.getMe(data));
      case "getUsers":
        return jsonResponse(UserService.getUsers(data));
      case "approveUser":
        return jsonResponse(UserService.approveUser(data));
      case "createRequest":
        return jsonResponse(RequestService.createRequest(data));
      case "getRequests":
        return jsonResponse(RequestService.getRequests(data));
      case "updateRequest":
        return jsonResponse(RequestService.updateRequest(data));
      case "approveRequest":
        return jsonResponse(RequestService.approveRequest(data));
      case "rejectRequest":
        return jsonResponse(RequestService.rejectRequest(data));
      case "createTask":
        return jsonResponse(TaskService.createTask(data));
      case "getTasks":
        return jsonResponse(TaskService.getTasks(data));
      case "updateTask":
        return jsonResponse(TaskService.updateTask(data));
      case "updateTaskStatus":
        return jsonResponse(TaskService.updateTaskStatus(data));
      case "deleteTask":
        return jsonResponse(TaskService.deleteTask(data));
      case "getNotifications":
        return jsonResponse(NotificationService.getNotifications(data));
      case "markNotificationRead":
        return jsonResponse(NotificationService.markAsRead(data));
      case "markAllRead":
        return jsonResponse(NotificationService.markAllAsRead(data));
      case "getDashboardStats":
        return jsonResponse(DashboardService.getStats(data));
      case "getTeamWorkload":
        return jsonResponse(DashboardService.getTeamWorkload(data));
      case "sendEmail":
        return jsonResponse(EmailService.sendEmail(data));
      default:
        return jsonResponse({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

/**
 * Helper: Create JSON response
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Helper: Generate unique ID
 */
function generateId(prefix) {
  const now = new Date();
  const dateStr = Utilities.formatDate(
    now,
    Session.getScriptTimeZone(),
    "yyyyMMdd",
  );
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${dateStr}-${random}`;
}

/**
 * Helper: Get spreadsheet
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * Helper: Get sheet by name
 */
function getSheet(sheetName) {
  const spreadsheet = getSpreadsheet();
  return spreadsheet.getSheetByName(sheetName);
}

/**
 * Helper: Hash password (SHA-256)
 */
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8,
  );
  return rawHash
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

/**
 * Helper: Generate session token
 */
function generateToken() {
  return Utilities.getUuid();
}

/**
 * Helper: Send email
 */
function sendEmail(to, subject, body) {
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: body,
  });
}

/**
 * Trigger: Check deadlines and send reminders
 */
function checkDeadlinesAndRemind() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active tasks
  const tasks = TaskService.getTasks({ status: "active" });

  if (!tasks.success || !tasks.tasks) return;

  tasks.tasks.forEach((task) => {
    if (task.status === "completed") return;

    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);

    const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    // Check if overdue
    if (daysRemaining < 0 && task.status !== "overdue") {
      TaskService.updateTaskStatus({
        taskId: task.task_id,
        status: "overdue",
      });
      NotificationService.createOverdueNotification(task);
    }

    // Send reminders
    CONFIG.REMINDER_DAYS.forEach((days) => {
      if (daysRemaining === days) {
        NotificationService.sendDeadlineReminder(task, days);
      }
    });
  });
}

/**
 * Set up daily trigger for deadline checks
 */
function createDailyTrigger() {
  ScriptApp.newTrigger("checkDeadlinesAndRemind")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
}

/**
 * Test function - Run this from Apps Script editor to verify setup
 */
function testSetup() {
  console.log("Testing Media Team Portal configuration...");

  // Check config
  const configCheck = checkConfig();
  console.log("Config check:", JSON.stringify(configCheck));

  if (!configCheck.success) {
    console.error("Configuration error:", configCheck.error);
    return;
  }

  // Try to access Users sheet
  try {
    const usersSheet = getSheet(CONFIG.SHEETS.USERS);
    const lastRow = usersSheet.getLastRow();
    console.log(`Users sheet found. Rows: ${lastRow}`);
  } catch (error) {
    console.error("Error accessing Users sheet:", error.message);
  }

  console.log("Setup test completed!");
}
