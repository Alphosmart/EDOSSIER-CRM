const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const CommissionPayout = require('../models/CommissionPayout');
const AuditLog = require('../models/AuditLog');
const csv = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

// Helper: filter leads by user role
const filterLeadsByRole = (user) => {
  const base = { isDeleted: { $ne: true } };
  switch (user.role) {
    case 'sales_rep':
      return { ...base, assignedTo: user._id };
    case 'team_lead':
      return { ...base, territory: user.territory };
    case 'manager':
    case 'admin':
      return base;
    default:
      return { ...base, assignedTo: user._id };
  }
};

// @desc    Get all leads (filtered by role)
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);

    // Query params for filtering
    const { status, territory, search, page = 1, limit = 50 } = req.query;

    if (status) filter.currentStatus = status;
    if (territory) filter.territory = territory;
    if (search) {
      filter.$or = [
        { schoolName: { $regex: search, $options: 'i' } },
        { schoolId: { $regex: search, $options: 'i' } },
        { personMet: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'firstName lastName email territory')
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
      .populate('assignedTo', 'firstName lastName email territory');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'sales_rep' && !lead.assignedTo._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this lead' });
    }
    if (req.user.role === 'team_lead' && lead.territory !== req.user.territory) {
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

    // Default assignment to current user if not specified
    if (!leadData.assignedTo) {
      leadData.assignedTo = req.user._id;
    }

    // Default territory from user if not set
    if (!leadData.territory && req.user.territory) {
      leadData.territory = req.user.territory;
    }

    // Default commission rate from user
    if (!leadData.commissionPercentage) {
      leadData.commissionPercentage = req.user.defaultCommissionRate;
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
      .populate('assignedTo', 'firstName lastName email territory');

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

    // Check authorization
    if (req.user.role === 'sales_rep' && !lead.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this lead' });
    }
    if (req.user.role === 'team_lead' && lead.territory !== req.user.territory) {
      return res.status(403).json({ message: 'Not authorized to edit this lead' });
    }

    const previousStatus = lead.currentStatus;

    // Commission % — admin only
    const adminOnlyFields = ['commissionPercentage'];
    // Financial / assignment — admin or manager
    const adminOrManagerFields = ['paymentStatus', 'amountPaid', 'assignedTo'];

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key === '_id' || key === 'schoolId') return;
      if (adminOnlyFields.includes(key) && req.user.role !== 'admin') return;
      if (adminOrManagerFields.includes(key) && !['admin', 'manager'].includes(req.user.role)) return;
      lead[key] = req.body[key];
    });

    await lead.save();

    // If status changed to Closed Won, create commission payout
    if (previousStatus !== 'Closed Won' && lead.currentStatus === 'Closed Won') {
      lead.actualClosingDate = lead.actualClosingDate || new Date();
      await lead.save();

      await CommissionPayout.create({
        userId: lead.assignedTo,
        leadId: lead._id,
        dealAmount: lead.negotiatedPrice,
        commissionPercentage: lead.commissionPercentage,
        commissionAmount: lead.commissionAmount
      });

      // Log status change
      await Activity.create({
        leadId: lead._id,
        userId: req.user._id,
        activityType: 'Status Change',
        description: `Deal closed: ${lead.schoolName} - ₦${lead.negotiatedPrice?.toLocaleString()}`,
        outcome: 'Closed Won'
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
      .populate('assignedTo', 'firstName lastName email territory');

    res.json(updatedLead);
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

    // Sales reps can only attach files to their own leads
    if (req.user.role === 'sales_rep' && !lead.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to modify this lead' });
    }
    if (req.user.role === 'team_lead' && lead.territory !== req.user.territory) {
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
