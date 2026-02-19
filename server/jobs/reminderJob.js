const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Lead = require('../models/Lead');
const User = require('../models/User');

// Create a nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendReminderEmails = async () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[ReminderJob] SMTP not configured — skipping email reminders');
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Overdue leads (past due, not closed)
    const overdueLeads = await Lead.find({
      nextFollowUpDate: { $lt: today },
      currentStatus: { $nin: ['Closed Won', 'Closed Lost', 'Not Interested'] },
      isDeleted: { $ne: true }
    }).populate('assignedTo', 'firstName lastName email');

    // Today's follow-ups
    const todayLeads = await Lead.find({
      nextFollowUpDate: { $gte: today, $lt: tomorrow },
      currentStatus: { $nin: ['Closed Won', 'Closed Lost', 'Not Interested'] },
      isDeleted: { $ne: true }
    }).populate('assignedTo', 'firstName lastName email');

    // Group by user
    const userMap = {};

    const addToUserMap = (lead, type) => {
      if (!lead.assignedTo || !lead.assignedTo.email) return;
      const uid = lead.assignedTo._id.toString();
      if (!userMap[uid]) {
        userMap[uid] = { user: lead.assignedTo, overdue: [], today: [] };
      }
      userMap[uid][type].push(lead);
    };

    overdueLeads.forEach(l => addToUserMap(l, 'overdue'));
    todayLeads.forEach(l => addToUserMap(l, 'today'));

    const transporter = createTransporter();

    for (const uid of Object.keys(userMap)) {
      const { user, overdue, today: todayList } = userMap[uid];
      if (overdue.length === 0 && todayList.length === 0) continue;

      const overdueRows = overdue.map(l =>
        `<tr><td style="padding:4px 8px">${l.schoolName}</td><td style="padding:4px 8px">${l.currentStatus}</td><td style="padding:4px 8px;color:red">${new Date(l.nextFollowUpDate).toLocaleDateString()}</td></tr>`
      ).join('');

      const todayRows = todayList.map(l =>
        `<tr><td style="padding:4px 8px">${l.schoolName}</td><td style="padding:4px 8px">${l.currentStatus}</td><td style="padding:4px 8px">${new Date(l.nextFollowUpDate).toLocaleDateString()}</td></tr>`
      ).join('');

      const html = `
        <h2 style="color:#2563eb">EDOSSIER CRM — Daily Follow-Up Reminder</h2>
        <p>Hi ${user.firstName},</p>
        ${overdue.length > 0 ? `
          <h3 style="color:#dc2626">⚠ Overdue Follow-Ups (${overdue.length})</h3>
          <table border="1" cellspacing="0" style="border-collapse:collapse;width:100%">
            <thead><tr style="background:#fee2e2"><th style="padding:4px 8px">School</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>${overdueRows}</tbody>
          </table>
        ` : ''}
        ${todayList.length > 0 ? `
          <h3 style="color:#d97706">📅 Due Today (${todayList.length})</h3>
          <table border="1" cellspacing="0" style="border-collapse:collapse;width:100%">
            <thead><tr style="background:#fef3c7"><th style="padding:4px 8px">School</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>${todayRows}</tbody>
          </table>
        ` : ''}
        <p style="margin-top:16px;color:#6b7280">Log in to <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}">EDOSSIER CRM</a> to take action.</p>
      `;

      try {
        await transporter.sendMail({
          from: `"EDOSSIER CRM" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: `[EDOSSIER] ${overdue.length} Overdue + ${todayList.length} Due Today`,
          html
        });
        console.log(`[ReminderJob] Sent reminder to ${user.email}`);
      } catch (mailErr) {
        console.error(`[ReminderJob] Failed to send to ${user.email}:`, mailErr.message);
      }
    }

    console.log(`[ReminderJob] Done — processed ${overdueLeads.length} overdue + ${todayLeads.length} today`);
  } catch (err) {
    console.error('[ReminderJob] Error:', err.message);
  }
};

// Schedule: Every day at 8:00 AM (server timezone)
const startReminderJob = () => {
  cron.schedule('0 8 * * *', () => {
    console.log('[ReminderJob] Running daily follow-up reminders...');
    sendReminderEmails();
  });
  console.log('[ReminderJob] Daily reminder job scheduled at 08:00');
};

module.exports = { startReminderJob, sendReminderEmails };
