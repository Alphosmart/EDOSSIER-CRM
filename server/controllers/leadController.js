const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const CommissionPayout = require('../models/CommissionPayout');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { hasPermission, PERMISSIONS } = require('../utils/permissions');
const csv = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const { filterLeadsByRole } = require('../utils/queryHelpers');

const canAssignLead = (user) => hasPermission(user, PERMISSIONS.LEADS_ASSIGN);

const calculateCommissionAmount = (dealAmount, percentage) => {
  if (!dealAmount || !percentage) return 0;
  return parseFloat(((dealAmount * percentage) / 100).toFixed(2));
};

const createCommissionPayoutsForLead = async (lead) => {
  const existingPayouts = await CommissionPayout.countDocuments({ leadId: lead._id });
  if (existingPayouts > 0) return;

  const totalPct = Number(lead.commissionPercentage || 0);
  const dealAmount = Number(lead.negotiatedPrice || 0);
  if (!dealAmount || !totalPct) return;

  const splitAllowed =
    lead.commissionSplitEnabled &&
    lead.createdBy &&
    lead.assignedTo &&
    lead.createdBy.toString() !== lead.assignedTo.toString() &&
    Number(lead.originatorCommissionPercentage || 0) > 0;

  if (splitAllowed) {
    const originatorPct = Math.min(Number(lead.originatorCommissionPercentage || 0), totalPct);
    const assigneePct = Math.max(totalPct - originatorPct, 0);

    const payoutDocs = [];
    if (assigneePct > 0) {
      payoutDocs.push({
        userId: lead.assignedTo,
        leadId: lead._id,
        dealAmount,
        commissionPercentage: assigneePct,
        commissionAmount: calculateCommissionAmount(dealAmount, assigneePct),
        payoutRole: 'assignee',
        note: 'Assignee share from split commission'
      });
    }
    payoutDocs.push({
      userId: lead.createdBy,
      leadId: lead._id,
      dealAmount,
      commissionPercentage: originatorPct,
      commissionAmount: calculateCommissionAmount(dealAmount, originatorPct),
      payoutRole: 'originator',
      note: 'Originator share for bringing the lead'
    });

    await CommissionPayout.insertMany(payoutDocs);
    return;
  }

  await CommissionPayout.create({
    userId: lead.assignedTo,
    leadId: lead._id,
    dealAmount,
    commissionPercentage: totalPct,
    commissionAmount: calculateCommissionAmount(dealAmount, totalPct),
    payoutRole: 'owner'
  });
};

// @desc    Get all leads (filtered by role)
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);

    // Query params for filtering
    const { status, territory, search, country, myLeads, page = 1, limit = 50 } = req.query;

    if (status) filter.currentStatus = status;
    if (territory) filter.territory = territory;
    if (country) filter.country = country;
    // myLeads=true → only leads this user personally created (brought)
    if (myLeads === 'true') {
      filter.$or = [{ createdBy: req.user._id }];
      delete filter.assignedTo; // clear the role-based assignedTo filter
    }
    if (search) {
      const searchCond = [
        { schoolName: { $regex: search, $options: 'i' } },
        { schoolId: { $regex: search, $options: 'i' } },
        { personMet: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
      // Merge with existing $or if present (e.g. from myLeads or sales_rep filter)
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchCond }];
        delete filter.$or;
      } else {
        filter.$or = searchCond;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'firstName lastName email territory')
        .populate('createdBy', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Lead.countDocuments(filter)
    ]);

    res.json({
      leads,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email territory')
      .populate('createdBy', 'firstName lastName email')
      .populate('reassignmentHistory.fromUser', 'firstName lastName email')
      .populate('reassignmentHistory.toUser', 'firstName lastName email')
      .populate('reassignmentHistory.reassignedBy', 'firstName lastName email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check access: allow if assigned, created by, within territory, or admin/manager
    const isAssigned  = lead.assignedTo?._id.equals(req.user._id);
    const isCreator   = lead.createdBy?._id?.equals(req.user._id);
    if (req.user.role === 'sales_rep' && !isAssigned && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to view this lead' });
    }
    if (req.user.role === 'team_lead' && lead.territory !== req.user.territory && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to view this lead' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new lead
// @route   POST /api/leads
// @access  Private
exports.createLead = async (req, res) => {
  try {
    const leadData = { ...req.body };

    // Always record who brought this lead
    leadData.createdBy = req.user._id;
    if (leadData.commissionSplitEnabled === undefined) {
      leadData.commissionSplitEnabled = false;
    }
    if (leadData.originatorCommissionPercentage === undefined) {
      leadData.originatorCommissionPercentage = 0;
    }

    // Sales reps always own the leads they create — ignore any submitted assignedTo
    if (!['admin', 'manager'].includes(req.user.role)) {
      leadData.assignedTo = req.user._id;
    } else if (!leadData.assignedTo) {
      // Admin/manager: default to themselves if not specified
      leadData.assignedTo = req.user._id;
    }

    // Default territory from assigned user's territory if not set
    if (!leadData.territory && req.user.territory) {
      leadData.territory = req.user.territory;
    }

    // Default country and currency
    if (!leadData.country) leadData.country = 'Nigeria';
    if (!leadData.currency) leadData.currency = 'NGN';

    // Commission rate:
    // - Reps always get their own default rate (they can't self-inflate)
    // - Admin/manager: if creating on behalf of another user, pull that user's default rate
    //   unless they explicitly set one
    if (!['admin', 'manager'].includes(req.user.role)) {
      leadData.commissionPercentage = req.user.defaultCommissionRate || 25;
    } else if (!leadData.commissionPercentage) {
      // Look up the assigned user's rate if different from the creator
      const assignedUserId = leadData.assignedTo?.toString();
      if (assignedUserId && assignedUserId !== req.user._id.toString()) {
        const assignedUser = await User.findById(assignedUserId).select('defaultCommissionRate');
        leadData.commissionPercentage = assignedUser?.defaultCommissionRate || req.user.defaultCommissionRate || 25;
      } else {
        leadData.commissionPercentage = req.user.defaultCommissionRate || 25;
      }
    }

    // Duplicate detection: same school name in same territory/LGA
    const duplicateFilter = { schoolName: { $regex: `^${leadData.schoolName}$`, $options: 'i' } };
    if (leadData.lga) duplicateFilter.lga = { $regex: `^${leadData.lga}$`, $options: 'i' };
    else if (leadData.territory) duplicateFilter.territory = leadData.territory;

    const existing = await Lead.findOne(duplicateFilter);
    if (existing) {
      return res.status(409).json({
        message: `A lead for "${existing.schoolName}" already exists in this area (ID: ${existing.schoolId}).`,
        duplicate: { _id: existing._id, schoolId: existing.schoolId, schoolName: existing.schoolName }
      });
    }

    const lead = await Lead.create(leadData);

    // Log activity
    await Activity.create({
      leadId: lead._id,
      userId: req.user._id,
      activityType: 'Note Added',
      description: `Lead created: ${lead.schoolName}`,
      outcome: 'New lead added to pipeline'
    });

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE',
      resource: 'lead',
      resourceId: lead._id,
      ip: req.ip
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email territory')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json(populatedLead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
exports.updateLead = async (req, res) => {
  try {
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check authorization: assigned rep, original creator, team_lead in territory, or admin/manager
    const isAssigned  = lead.assignedTo?.equals(req.user._id);
    const isCreator   = lead.createdBy?.equals(req.user._id);
    if (req.user.role === 'sales_rep' && !isAssigned && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to edit this lead' });
    }
    if (req.user.role === 'team_lead' && lead.territory !== req.user.territory && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to edit this lead' });
    }

    const previousStatus = lead.currentStatus;
    const previousAssignedTo = lead.assignedTo;

    // Financial fields
    const financialFields = ['commissionPercentage', 'paymentStatus', 'amountPaid'];
    // Assignment and split rules are controlled by users with lead assignment permission
    const assignmentFields = ['assignedTo', 'commissionSplitEnabled', 'originatorCommissionPercentage'];

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (['_id', 'schoolId', 'createdBy', 'reassignmentHistory', 'commissionAmount'].includes(key)) return;
      if (financialFields.includes(key) && !['admin', 'bursar'].includes(req.user.role)) return;
      if (assignmentFields.includes(key) && !canAssignLead(req.user)) return;
      lead[key] = req.body[key];
    });

    // If lead is handled by the same person who brought it, split commission is not applicable.
    if (lead.createdBy && lead.assignedTo && lead.createdBy.toString() === lead.assignedTo.toString()) {
      lead.commissionSplitEnabled = false;
      lead.originatorCommissionPercentage = 0;
    }

    if (lead.commissionSplitEnabled) {
      const originatorPct = Number(lead.originatorCommissionPercentage || 0);
      const totalPct = Number(lead.commissionPercentage || 0);
      if (originatorPct < 0 || originatorPct > totalPct) {
        return res.status(400).json({
          message: 'Originator split percentage must be between 0 and total commission percentage'
        });
      }
    }

    const assignmentChanged =
      previousAssignedTo &&
      lead.assignedTo &&
      previousAssignedTo.toString() !== lead.assignedTo.toString();

    if (assignmentChanged) {
      lead.reassignmentHistory.push({
        fromUser: previousAssignedTo,
        toUser: lead.assignedTo,
        reassignedBy: req.user._id,
        reason: req.body.reassignmentReason || 'Reassigned during lead update'
      });
    }

    await lead.save();

    if (assignmentChanged) {
      const [fromUser, toUser] = await Promise.all([
        User.findById(previousAssignedTo).select('firstName lastName'),
        User.findById(lead.assignedTo).select('firstName lastName')
      ]);

      await Activity.create({
        leadId: lead._id,
        userId: req.user._id,
        activityType: 'Note Added',
        description: `Lead reassigned from ${fromUser ? `${fromUser.firstName} ${fromUser.lastName}` : 'previous assignee'} to ${toUser ? `${toUser.firstName} ${toUser.lastName}` : 'new assignee'}`,
        outcome: 'Assignment updated'
      });

      createNotification(
        lead.assignedTo,
        'follow_up',
        `New lead assigned: ${lead.schoolName}`,
        `You were assigned this lead for follow-up by ${req.user.firstName || 'a manager'} ${req.user.lastName || ''}`.trim(),
        `/leads/${lead._id}`
      );
    }

    // Stamp which follow-up closed the deal (Closed Won OR Closed Lost)
    const isClosingTransition =
      !['Closed Won', 'Closed Lost'].includes(previousStatus) &&
      ['Closed Won', 'Closed Lost'].includes(lead.currentStatus);

    if (isClosingTransition) {
      const activityCount = await Activity.countDocuments({ leadId: lead._id });
      lead.closedAtFollowUp = activityCount + 1; // +1 = the closing activity about to be logged
      await lead.save();
    }

    if (previousStatus !== 'Closed Won' && lead.currentStatus === 'Closed Won') {
      lead.actualClosingDate = lead.actualClosingDate || new Date();
      
      // Use assigned user's default commission rate if not set on lead
      if (!lead.commissionPercentage || lead.commissionPercentage === 0) {
        const assignedUser = await User.findById(lead.assignedTo);
        if (assignedUser && assignedUser.defaultCommissionRate) {
          lead.commissionPercentage = assignedUser.defaultCommissionRate;
        }
      }
      
      await lead.save();

      await createCommissionPayoutsForLead(lead);

      await Activity.create({
        leadId: lead._id,
        userId: req.user._id,
        activityType: 'Status Change',
        description: `Deal closed: ${lead.schoolName} - ₦${lead.negotiatedPrice?.toLocaleString()}`,
        outcome: 'Closed Won',
        isClosingActivity: true
      });
    } else if (previousStatus !== 'Closed Lost' && lead.currentStatus === 'Closed Lost') {
      await Activity.create({
        leadId: lead._id,
        userId: req.user._id,
        activityType: 'Status Change',
        description: `Deal lost: ${lead.schoolName} — moved from ${previousStatus}`,
        outcome: 'Closed Lost',
        isClosingActivity: true
      });
    } else if (previousStatus !== lead.currentStatus) {
      await Activity.create({
        leadId: lead._id,
        userId: req.user._id,
        activityType: 'Status Change',
        description: `Status changed from ${previousStatus} to ${lead.currentStatus}`,
        outcome: lead.currentStatus
      });
    }

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email territory')
      .populate('createdBy', 'firstName lastName email');

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reassign lead and optionally configure split commission
// @route   PUT /api/leads/:id/reassign
// @access  Private (users with lead assignment permission)
exports.reassignLead = async (req, res) => {
  try {
    if (!canAssignLead(req.user)) {
      return res.status(403).json({ message: 'You do not have permission to reassign leads' });
    }

    const { assignedTo, reason, commissionSplitEnabled, originatorCommissionPercentage } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ message: 'assignedTo is required' });
    }

    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email territory')
      .populate('createdBy', 'firstName lastName email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const targetUser = await User.findById(assignedTo).select('firstName lastName email isActive');
    if (!targetUser || !targetUser.isActive) {
      return res.status(400).json({ message: 'Selected user is not available for assignment' });
    }

    const previousAssignedTo = lead.assignedTo?._id || lead.assignedTo;
    const assignmentChanged = previousAssignedTo.toString() !== targetUser._id.toString();
    const splitFlagProvided = commissionSplitEnabled !== undefined;
    const originatorPctProvided = originatorCommissionPercentage !== undefined;

    if (!assignmentChanged && !splitFlagProvided && !originatorPctProvided) {
      return res.status(400).json({ message: 'No reassignment or split changes detected' });
    }

    let previousAssigneeUser = null;
    if (assignmentChanged) {
      previousAssigneeUser = await User.findById(previousAssignedTo).select('firstName lastName');
      lead.assignedTo = targetUser._id;
      lead.reassignmentHistory.push({
        fromUser: previousAssignedTo,
        toUser: targetUser._id,
        reassignedBy: req.user._id,
        reason: reason || 'Lead reassigned for continued follow-up'
      });
    }

    // Update split settings if passed by caller.
    if (splitFlagProvided) {
      lead.commissionSplitEnabled = Boolean(commissionSplitEnabled);
    }
    if (originatorPctProvided) {
      lead.originatorCommissionPercentage = Number(originatorCommissionPercentage || 0);
    }

    // Split cannot apply when the originator is also the assignee.
    if (lead.createdBy && lead.assignedTo && lead.createdBy._id.toString() === lead.assignedTo.toString()) {
      lead.commissionSplitEnabled = false;
      lead.originatorCommissionPercentage = 0;
    }

    if (lead.commissionSplitEnabled) {
      const totalPct = Number(lead.commissionPercentage || 0);
      const originatorPct = Number(lead.originatorCommissionPercentage || 0);
      if (originatorPct < 0 || originatorPct > totalPct) {
        return res.status(400).json({
          message: 'Originator split percentage must be between 0 and total commission percentage'
        });
      }
    }

    await lead.save();

    if (assignmentChanged) {
      await Activity.create({
        leadId: lead._id,
        userId: req.user._id,
        activityType: 'Note Added',
        description: `Lead reassigned from ${previousAssigneeUser ? `${previousAssigneeUser.firstName} ${previousAssigneeUser.lastName}` : 'previous assignee'} to ${targetUser.firstName} ${targetUser.lastName}`,
        outcome: reason || 'Assignment updated'
      });

      createNotification(
        targetUser._id,
        'follow_up',
        `New lead assigned: ${lead.schoolName}`,
        `You have been assigned this lead to continue follow-up${reason ? ` (${reason})` : ''}.`,
        `/leads/${lead._id}`
      );

      if (previousAssignedTo.toString() !== req.user._id.toString()) {
        createNotification(
          previousAssignedTo,
          'follow_up',
          `Lead reassigned: ${lead.schoolName}`,
          `${targetUser.firstName} ${targetUser.lastName} will continue follow-up on this lead.`,
          `/leads/${lead._id}`
        );
      }
    }

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'REASSIGN',
      resource: 'lead',
      resourceId: lead._id,
      changes: {
        fromAssignedTo: previousAssignedTo,
        toAssignedTo: lead.assignedTo,
        commissionSplitEnabled: lead.commissionSplitEnabled,
        originatorCommissionPercentage: lead.originatorCommissionPercentage,
        reason: reason || null
      },
      ip: req.ip
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email territory')
      .populate('createdBy', 'firstName lastName email')
      .populate('reassignmentHistory.fromUser', 'firstName lastName email')
      .populate('reassignmentHistory.toUser', 'firstName lastName email')
      .populate('reassignmentHistory.reassignedBy', 'firstName lastName email');

    res.json(populatedLead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update lead status
// @route   PUT /api/leads/:id/status
// @access  Private
exports.updateLeadStatus = async (req, res) => {
  try {
    req.body = { currentStatus: req.body.status || req.body.currentStatus };
    return exports.updateLead(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete lead (soft delete)
// @route   DELETE /api/leads/:id
// @access  Manager/Admin
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.isDeleted = true;
    await lead.save();

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get overdue follow-ups
// @route   GET /api/leads/overdue
// @access  Private
exports.getOverdueLeads = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);
    filter.nextFollowUpDate = { $lt: new Date() };
    filter.currentStatus = {
      $nin: ['Closed Won', 'Closed Lost', 'Not Interested']
    };

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .sort({ nextFollowUpDate: 1 });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get today's follow-ups
// @route   GET /api/leads/today
// @access  Private
exports.getTodayLeads = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    filter.nextFollowUpDate = { $gte: today, $lt: tomorrow };
    filter.currentStatus = {
      $nin: ['Closed Won', 'Closed Lost', 'Not Interested']
    };

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .sort({ nextFollowUpDate: 1 });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import leads from CSV
// @route   POST /api/leads/import
// @access  Private (manager/admin)
exports.importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let fileContent;
    try {
      fileContent = fs.readFileSync(req.file.path, 'utf8');
    } catch (err) {
      return res.status(400).json({ message: 'Could not read uploaded file' });
    }

    let records;
    try {
      records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseErr) {
      return res.status(400).json({ message: `CSV parse error: ${parseErr.message}` });
    }

    if (!records || records.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty or has no valid rows' });
    }

    const results = { imported: 0, skipped: 0, errors: [] };
    const territories = ['Kaduna', 'Abuja', 'Lagos', 'Other'];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // Account for header row

      try {
        if (!row.schoolName) {
          results.errors.push({ row: rowNum, error: 'Missing schoolName' });
          results.skipped++;
          continue;
        }

        // Check for duplicate
        const existing = await Lead.findOne({
          schoolName: { $regex: `^${row.schoolName.trim()}$`, $options: 'i' }
        });
        if (existing) {
          results.skipped++;
          results.errors.push({ row: rowNum, school: row.schoolName, error: `Duplicate: ${existing.schoolId}` });
          continue;
        }

        const leadData = {
          schoolName: row.schoolName?.trim(),
          schoolType: row.schoolType,
          address: row.address,
          city: row.city,
          state: row.state,
          lga: row.lga,
          territory: territories.includes(row.territory) ? row.territory : (req.user.territory || 'Other'),
          personMet: row.personMet,
          positionTitle: row.positionTitle,
          phoneNumber: row.phoneNumber,
          emailAddress: row.emailAddress,
          currentStatus: row.currentStatus || 'Interested',
          nextFollowUpDate: row.nextFollowUpDate ? new Date(row.nextFollowUpDate) : undefined,
          proposedPrice: parseFloat(row.proposedPrice) || 0,
          responseSummary: row.responseSummary,
          assignedTo: req.user._id,
          createdBy: req.user._id,
          commissionPercentage: parseFloat(row.commissionPercentage) || req.user.defaultCommissionRate || 25
        };

        await Lead.create(leadData);
        results.imported++;
      } catch (rowErr) {
        results.errors.push({ row: rowNum, school: row.schoolName, error: rowErr.message });
        results.skipped++;
      }
    }

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'IMPORT',
      resource: 'lead',
      changes: { imported: results.imported, skipped: results.skipped },
      ip: req.ip
    });

    res.json({
      message: `Import complete: ${results.imported} imported, ${results.skipped} skipped`,
      ...results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add attachment to lead
// @route   POST /api/leads/:id/attachments
// @access  Private
exports.addAttachment = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Sales reps can attach files if they are assigned or brought the lead
    const canEdit = ['admin', 'manager'].includes(req.user.role)
      || lead.assignedTo?.equals(req.user._id)
      || lead.createdBy?.equals(req.user._id)
      || (req.user.role === 'team_lead' && lead.territory === req.user.territory);
    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to modify this lead' });
    }

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path.replace(/\\/g, '/'),
      fileSize: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user._id
    };

    lead.attachments.push(attachment);
    await lead.save();

    await Activity.create({
      leadId: lead._id,
      userId: req.user._id,
      activityType: 'Note Added',
      description: `File attached: ${req.file.originalname}`
    });

    res.json({ message: 'File uploaded successfully', attachment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete attachment from lead
// @route   DELETE /api/leads/:id/attachments/:attachmentId
// @access  Private (manager/admin)
exports.deleteAttachment = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const attachment = lead.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Remove file from disk
    try {
      fs.unlinkSync(attachment.filePath);
    } catch (e) { /* file may not exist */ }

    attachment.deleteOne();
    await lead.save();

    res.json({ message: 'Attachment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
