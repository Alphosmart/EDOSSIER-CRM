const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Add leads to a user bucket map
const addToUserMap = (map, lead, bucket) => {
  if (!lead.assignedTo) return;
  const uid = lead.assignedTo._id.toString();
  if (!map[uid]) map[uid] = { user: lead.assignedTo, overdue: [], today: [], tomorrow: [] };
  map[uid][bucket].push(lead);
};

// Create in-app notifications with 12h dedup per lead+user
const createInAppNotifications = async (userMap) => {
  const dedupeWindow = new Date(Date.now() - 12 * 60 * 60 * 1000);
  for (const uid of Object.keys(userMap)) {
    const { user, overdue, today: todayList, tomorrow: tomorrowList } = userMap[uid];
    const userId = user._id;
    const notify = async (lead, emoji, titlePrefix, msgPrefix) => {
      const exists = await Notification.findOne({
        userId, type: 'follow_up', link: `/leads/${lead._id}`,
        createdAt: { $gte: dedupeWindow }
      });
      if (exists) return;
      const dueStr = lead.nextFollowUpDate
        ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        : '';
      await Notification.create({
        userId, type: 'follow_up',
        title: `${emoji} ${titlePrefix}: ${lead.schoolName}`,
        message: `${msgPrefix}${dueStr ? ` — ${dueStr}` : ''}${lead.followUpMethod ? ` via ${lead.followUpMethod}` : ''}`,
        link: `/leads/${lead._id}`
      });
    };
    for (const l of overdue)    await notify(l, '⚠️', 'Overdue Follow-up',   'Missed follow-up');
    for (const l of todayList)  await notify(l, '📅', 'Follow-up Due Today', 'Action needed today');
    for (const l of tomorrowList) await notify(l, '🔔', 'Follow-up Tomorrow', 'Coming up tomorrow');
  }
};

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
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);

    const base = { currentStatus: { $nin: ['Closed Won', 'Closed Lost', 'Not Interested'] }, isDeleted: { $ne: true } };

    const [overdueLeads, todayLeads, tomorrowLeads] = await Promise.all([
      Lead.find({ ...base, nextFollowUpDate: { $lt: today } }).populate('assignedTo', 'firstName lastName email'),
      Lead.find({ ...base, nextFollowUpDate: { $gte: today, $lt: tomorrow } }).populate('assignedTo', 'firstName lastName email'),
      Lead.find({ ...base, nextFollowUpDate: { $gte: tomorrow, $lt: dayAfter } }).populate('assignedTo', 'firstName lastName email'),
    ]);

    const userMap = {};
    overdueLeads.forEach(l  => addToUserMap(userMap, l, 'overdue'));
    todayLeads.forEach(l    => addToUserMap(userMap, l, 'today'));
    tomorrowLeads.forEach(l => addToUserMap(userMap, l, 'tomorrow'));

    // Always write in-app notifications
    await createInAppNotifications(userMap);

    // Email — only when SMTP configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('[ReminderJob] SMTP not configured — skipping email reminders');
    } else {
      const transporter = createTransporter();
      const row = (l, color) =>
        `<tr><td style="padding:4px 8px">${l.schoolName}</td><td style="padding:4px 8px">${l.currentStatus}</td><td style="padding:4px 8px;color:${color}">${l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toLocaleDateString() : '—'}</td></tr>`;

      for (const uid of Object.keys(userMap)) {
        const { user, overdue, today: todayList, tomorrow: tomorrowList } = userMap[uid];
        if (!overdue.length && !todayList.length && !tomorrowList.length) continue;
        const html = `
          <h2 style="color:#2563eb">EDOSSIER CRM — Daily Follow-Up Reminder</h2>
          <p>Hi ${user.firstName},</p>
          ${overdue.length ? `<h3 style="color:#dc2626">⚠ Overdue (${overdue.length})</h3>
            <table border="1" cellspacing="0" style="border-collapse:collapse;width:100%">
              <thead><tr style="background:#fee2e2"><th style="padding:4px 8px">School</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>${overdue.map(l => row(l, 'red')).join('')}</tbody></table>` : ''}
          ${todayList.length ? `<h3 style="color:#d97706">📅 Due Today (${todayList.length})</h3>
            <table border="1" cellspacing="0" style="border-collapse:collapse;width:100%">
              <thead><tr style="background:#fef3c7"><th style="padding:4px 8px">School</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>${todayList.map(l => row(l, '#d97706')).join('')}</tbody></table>` : ''}
          ${tomorrowList.length ? `<h3 style="color:#7c3aed">🔔 Due Tomorrow (${tomorrowList.length})</h3>
            <table border="1" cellspacing="0" style="border-collapse:collapse;width:100%">
              <thead><tr style="background:#ede9fe"><th style="padding:4px 8px">School</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>${tomorrowList.map(l => row(l, '#7c3aed')).join('')}</tbody></table>` : ''}
          <p style="margin-top:16px;color:#6b7280">Log in to <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}">EDOSSIER CRM</a> to take action.</p>`;
        try {
          await transporter.sendMail({
            from: `"EDOSSIER CRM" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: `[EDOSSIER] ${overdue.length} Overdue · ${todayList.length} Today · ${tomorrowList.length} Tomorrow`,
            html
          });
          console.log(`[ReminderJob] Sent to ${user.email}`);
        } catch (e) { console.error(`[ReminderJob] Mail failed for ${user.email}:`, e.message); }
      }
    }
    console.log(`[ReminderJob] Done — ${overdueLeads.length} overdue, ${todayLeads.length} today, ${tomorrowLeads.length} tomorrow`);
  } catch (err) {
    console.error('[ReminderJob] Error:', err.message);
  }
};

// 5 PM: in-app only — escalate still-overdue + advance notice for tomorrow
const runEveningReminders = async () => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);
    const base = { currentStatus: { $nin: ['Closed Won', 'Closed Lost', 'Not Interested'] }, isDeleted: { $ne: true } };
    const [overdueLeads, tomorrowLeads] = await Promise.all([
      Lead.find({ ...base, nextFollowUpDate: { $lt: today } }).populate('assignedTo', 'firstName lastName email'),
      Lead.find({ ...base, nextFollowUpDate: { $gte: tomorrow, $lt: dayAfter } }).populate('assignedTo', 'firstName lastName email'),
    ]);
    const userMap = {};
    overdueLeads.forEach(l  => addToUserMap(userMap, l, 'overdue'));
    tomorrowLeads.forEach(l => addToUserMap(userMap, l, 'tomorrow'));
    await createInAppNotifications(userMap);
    console.log(`[ReminderJob] Evening done — ${overdueLeads.length} overdue, ${tomorrowLeads.length} tomorrow`);
  } catch (err) { console.error('[ReminderJob] Evening error:', err.message); }
};

const startReminderJob = () => {
  cron.schedule('0 8 * * *', () => {
    console.log('[ReminderJob] Morning reminders...');
    sendReminderEmails();
  });
  cron.schedule('0 17 * * *', () => {
    console.log('[ReminderJob] Evening reminders...');
    runEveningReminders();
  });
  console.log('[ReminderJob] Scheduled: 08:00 (email+in-app) and 17:00 (in-app only)');
};

module.exports = { startReminderJob, sendReminderEmails };
