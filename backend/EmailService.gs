/**
 * Email Service
 * Sends email through Google Apps Script MailApp
 */

const EmailService = {
  sendEmail: function (data) {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const expectedApiKey = scriptProperties.getProperty("EMAIL_API_KEY");

      if (!expectedApiKey) {
        return {
          success: false,
          error: "EMAIL_API_KEY is not configured in Script Properties",
        };
      }

      const { apiKey, to, subject, html } = data || {};

      if (!apiKey || apiKey !== expectedApiKey) {
        return { success: false, error: "Unauthorized request" };
      }

      if (!to || !subject || !html) {
        return { success: false, error: "Missing required fields" };
      }

      MailApp.sendEmail({
        to: to,
        subject: subject,
        htmlBody: html,
      });

      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
