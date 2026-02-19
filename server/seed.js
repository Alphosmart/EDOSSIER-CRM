const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Lead = require('./models/Lead');
const Activity = require('./models/Activity');
const CommissionPayout = require('./models/CommissionPayout');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Lead.deleteMany({});
    await Activity.deleteMany({});
    await CommissionPayout.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const users = await User.create([
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@edossier.com',
        password: 'password123',
        role: 'admin',
        territory: 'Abuja',
        phone: '+234 800 000 0001',
        defaultCommissionRate: 25
      },
      {
        firstName: 'Chidi',
        lastName: 'Okafor',
        email: 'chidi@edossier.com',
        password: 'password123',
        role: 'manager',
        territory: 'Lagos',
        phone: '+234 800 000 0002',
        defaultCommissionRate: 20
      },
      {
        firstName: 'Amina',
        lastName: 'Bello',
        email: 'amina@edossier.com',
        password: 'password123',
        role: 'team_lead',
        territory: 'Kaduna',
        phone: '+234 800 000 0003',
        defaultCommissionRate: 25
      },
      {
        firstName: 'Emeka',
        lastName: 'Nwankwo',
        email: 'emeka@edossier.com',
        password: 'password123',
        role: 'sales_rep',
        territory: 'Lagos',
        phone: '+234 800 000 0004',
        defaultCommissionRate: 25
      },
      {
        firstName: 'Fatima',
        lastName: 'Abubakar',
        email: 'fatima@edossier.com',
        password: 'password123',
        role: 'sales_rep',
        territory: 'Abuja',
        phone: '+234 800 000 0005',
        defaultCommissionRate: 25
      },
      {
        firstName: 'Kunle',
        lastName: 'Adeyemi',
        email: 'kunle@edossier.com',
        password: 'password123',
        role: 'sales_rep',
        territory: 'Kaduna',
        phone: '+234 800 000 0006',
        defaultCommissionRate: 30
      }
    ]);

    console.log(`Created ${users.length} users`);

    const [admin, manager, teamLead, emeka, fatima, kunle] = users;

    // Create leads
    const leadsData = [
      {
        schoolName: 'Greenfield Academy',
        schoolType: 'Private',
        city: 'Ikeja',
        state: 'Lagos',
        numberOfStudents: 450,
        personMet: 'Mrs. Adebayo',
        positionTitle: 'Principal',
        phoneNumber: '+234 801 111 1111',
        emailAddress: 'info@greenfield.edu.ng',
        currentStatus: 'Closed Won',
        proposedPackage: 'Premium',
        proposedPrice: 350000,
        negotiatedPrice: 300000,
        commissionPercentage: 25,
        paymentStatus: 'Paid Fully',
        amountPaid: 300000,
        actualClosingDate: new Date('2026-01-15'),
        dateVisited: new Date('2025-12-10'),
        territory: 'Lagos',
        assignedTo: emeka._id,
        probabilityOfClosing: 100,
        relationshipStrength: 5,
        leadSource: 'Referral',
        nextFollowUpDate: null,
        subscriptionType: 'Annually',
        subscriptionStartDate: new Date('2026-01-15'),
        renewalDate: new Date('2027-01-15'),
        subscriptionPlan: 'Premium',
        storageSize: '25GB'
      },
      {
        schoolName: 'Royal Crown International School',
        schoolType: 'Private',
        city: 'Abuja',
        state: 'FCT',
        numberOfStudents: 800,
        personMet: 'Mr. Ibrahim',
        positionTitle: 'Director',
        phoneNumber: '+234 802 222 2222',
        emailAddress: 'admin@royalcrown.edu.ng',
        currentStatus: 'Negotiation',
        proposedPackage: 'Enterprise',
        proposedPrice: 800000,
        negotiatedPrice: 650000,
        commissionPercentage: 25,
        territory: 'Abuja',
        assignedTo: fatima._id,
        probabilityOfClosing: 75,
        relationshipStrength: 4,
        leadSource: 'Cold Call',
        dateVisited: new Date('2026-01-20'),
        nextFollowUpDate: new Date('2026-02-18'),
        followUpMethod: 'Physical Visit',
        expectedClosingDate: new Date('2026-03-01'),
        subscriptionPlan: 'Enterprise'
      },
      {
        schoolName: 'Kaduna International School',
        schoolType: 'Secondary',
        city: 'Kaduna',
        state: 'Kaduna',
        numberOfStudents: 600,
        personMet: 'Dr. Hassan',
        positionTitle: 'Proprietor',
        phoneNumber: '+234 803 333 3333',
        emailAddress: 'info@kadunais.edu.ng',
        currentStatus: 'Demo Scheduled',
        proposedPackage: 'Premium',
        proposedPrice: 500000,
        negotiatedPrice: 450000,
        commissionPercentage: 25,
        territory: 'Kaduna',
        assignedTo: kunle._id,
        probabilityOfClosing: 60,
        relationshipStrength: 3,
        leadSource: 'Website',
        dateVisited: new Date('2026-02-01'),
        nextFollowUpDate: new Date('2026-02-20'),
        nextMeetingScheduled: true,
        nextMeetingDate: new Date('2026-02-20'),
        followUpMethod: 'Physical Visit',
        expectedClosingDate: new Date('2026-03-15'),
        subscriptionPlan: 'Premium'
      },
      {
        schoolName: 'Lekki British International School',
        schoolType: 'Private',
        city: 'Lekki',
        state: 'Lagos',
        numberOfStudents: 1200,
        personMet: 'Mrs. Okonkwo',
        positionTitle: 'Admin Manager',
        phoneNumber: '+234 804 444 4444',
        emailAddress: 'admin@lekkibritish.edu.ng',
        currentStatus: 'Proposal Sent',
        proposedPackage: 'Enterprise',
        proposedPrice: 1200000,
        negotiatedPrice: 1000000,
        commissionPercentage: 20,
        territory: 'Lagos',
        assignedTo: emeka._id,
        probabilityOfClosing: 50,
        relationshipStrength: 3,
        leadSource: 'Conference',
        dateVisited: new Date('2026-01-25'),
        nextFollowUpDate: new Date('2026-02-16'),
        followUpMethod: 'Email',
        expectedClosingDate: new Date('2026-02-28'),
        subscriptionPlan: 'Enterprise'
      },
      {
        schoolName: 'Abuja Model School',
        schoolType: 'Public',
        city: 'Abuja',
        state: 'FCT',
        numberOfStudents: 2000,
        personMet: 'Alhaji Musa',
        positionTitle: 'Vice Principal',
        phoneNumber: '+234 805 555 5555',
        currentStatus: 'Needs Approval',
        proposedPackage: 'Enterprise',
        proposedPrice: 1500000,
        negotiatedPrice: 1200000,
        commissionPercentage: 15,
        territory: 'Abuja',
        assignedTo: fatima._id,
        probabilityOfClosing: 40,
        relationshipStrength: 2,
        leadSource: 'Government Outreach',
        dateVisited: new Date('2026-01-18'),
        nextFollowUpDate: new Date('2026-02-25'),
        followUpMethod: 'Call'
      },
      {
        schoolName: 'Sunshine Montessori',
        schoolType: 'Primary',
        city: 'Ikeja',
        state: 'Lagos',
        numberOfStudents: 200,
        personMet: 'Mrs. Williams',
        positionTitle: 'Owner',
        phoneNumber: '+234 806 666 6666',
        emailAddress: 'info@sunshinemontessori.ng',
        currentStatus: 'Interested',
        proposedPackage: 'Basic',
        proposedPrice: 150000,
        negotiatedPrice: 0,
        commissionPercentage: 25,
        territory: 'Lagos',
        assignedTo: emeka._id,
        probabilityOfClosing: 30,
        relationshipStrength: 2,
        leadSource: 'Referral',
        dateVisited: new Date('2026-02-05'),
        nextFollowUpDate: new Date('2026-02-12'),
        followUpMethod: 'WhatsApp'
      },
      {
        schoolName: 'Kaduna State College',
        schoolType: 'Tertiary',
        city: 'Kaduna',
        state: 'Kaduna',
        numberOfStudents: 5000,
        personMet: 'Prof. Abdullahi',
        positionTitle: 'Registrar',
        phoneNumber: '+234 807 777 7777',
        currentStatus: 'Needs Proposal',
        proposedPackage: 'Enterprise',
        proposedPrice: 2000000,
        negotiatedPrice: 0,
        commissionPercentage: 20,
        territory: 'Kaduna',
        assignedTo: kunle._id,
        probabilityOfClosing: 25,
        relationshipStrength: 2,
        leadSource: 'Cold Call',
        dateVisited: new Date('2026-02-08'),
        nextFollowUpDate: new Date('2026-02-22'),
        followUpMethod: 'Email'
      },
      {
        schoolName: 'Heritage Academy',
        schoolType: 'Private',
        city: 'Victoria Island',
        state: 'Lagos',
        numberOfStudents: 350,
        personMet: 'Mr. Eze',
        positionTitle: 'IT Director',
        phoneNumber: '+234 808 888 8888',
        emailAddress: 'it@heritageacademy.ng',
        currentStatus: 'Closed Won',
        proposedPackage: 'Premium',
        proposedPrice: 250000,
        negotiatedPrice: 200000,
        commissionPercentage: 40,
        paymentStatus: 'Paid Fully',
        amountPaid: 200000,
        actualClosingDate: new Date('2026-01-28'),
        dateVisited: new Date('2025-12-20'),
        territory: 'Lagos',
        assignedTo: emeka._id,
        probabilityOfClosing: 100,
        relationshipStrength: 5,
        leadSource: 'Referral',
        subscriptionType: 'Monthly',
        subscriptionStartDate: new Date('2026-01-28'),
        renewalDate: new Date('2026-02-28'),
        subscriptionPlan: 'Premium',
        storageSize: '10GB'
      },
      {
        schoolName: 'Capital City Academy',
        schoolType: 'Private',
        city: 'Garki',
        state: 'FCT',
        numberOfStudents: 500,
        personMet: 'Dr. Okafor',
        positionTitle: 'Proprietress',
        phoneNumber: '+234 809 999 9999',
        emailAddress: 'info@capitalcity.edu.ng',
        currentStatus: 'Closed Won',
        proposedPackage: 'Premium',
        proposedPrice: 1200000,
        negotiatedPrice: 1000000,
        commissionPercentage: 20,
        paymentStatus: 'Part Payment',
        amountPaid: 500000,
        actualClosingDate: new Date('2026-02-05'),
        dateVisited: new Date('2025-11-15'),
        territory: 'Abuja',
        assignedTo: fatima._id,
        probabilityOfClosing: 100,
        relationshipStrength: 5,
        leadSource: 'Conference',
        subscriptionType: 'Annually',
        subscriptionStartDate: new Date('2026-02-05'),
        renewalDate: new Date('2027-02-05'),
        subscriptionPlan: 'Enterprise',
        storageSize: '100GB'
      },
      {
        schoolName: 'Zaria Grammar School',
        schoolType: 'Secondary',
        city: 'Zaria',
        state: 'Kaduna',
        numberOfStudents: 900,
        personMet: 'Mallam Suleiman',
        positionTitle: 'Principal',
        phoneNumber: '+234 810 000 0000',
        currentStatus: 'Closed Lost',
        proposedPackage: 'Premium',
        proposedPrice: 400000,
        negotiatedPrice: 350000,
        commissionPercentage: 25,
        territory: 'Kaduna',
        assignedTo: kunle._id,
        probabilityOfClosing: 0,
        relationshipStrength: 1,
        leadSource: 'Cold Call',
        dateVisited: new Date('2025-12-01'),
        objectionsRaised: 'Budget constraints, already using competitor solution',
        competitorMentioned: 'SchoolGate'
      },
      {
        schoolName: 'Treasure House School',
        schoolType: 'Primary',
        city: 'Wuse',
        state: 'FCT',
        numberOfStudents: 150,
        personMet: 'Mrs. Danjuma',
        positionTitle: 'Head Teacher',
        phoneNumber: '+234 811 111 1111',
        currentStatus: 'Not Interested',
        proposedPackage: 'Basic',
        proposedPrice: 100000,
        negotiatedPrice: 0,
        territory: 'Abuja',
        assignedTo: fatima._id,
        probabilityOfClosing: 0,
        relationshipStrength: 1,
        leadSource: 'Walk-in',
        dateVisited: new Date('2026-01-10'),
        objectionsRaised: 'Too expensive for small school'
      },
      {
        schoolName: 'New Horizon Academy',
        schoolType: 'Private',
        city: 'Surulere',
        state: 'Lagos',
        numberOfStudents: 700,
        personMet: 'Chief Akinwale',
        positionTitle: 'Chairman Board of Governors',
        phoneNumber: '+234 812 222 2222',
        emailAddress: 'chairman@newhorizon.edu.ng',
        currentStatus: 'Negotiation',
        proposedPackage: 'Enterprise',
        proposedPrice: 900000,
        negotiatedPrice: 750000,
        commissionPercentage: 25,
        territory: 'Lagos',
        assignedTo: emeka._id,
        probabilityOfClosing: 80,
        relationshipStrength: 4,
        leadSource: 'Referral',
        dateVisited: new Date('2026-02-01'),
        nextFollowUpDate: new Date('2026-02-14'),
        followUpMethod: 'Physical Visit',
        expectedClosingDate: new Date('2026-02-25'),
        subscriptionPlan: 'Enterprise'
      }
    ];

    const leads = [];
    for (const leadData of leadsData) {
      const lead = await Lead.create(leadData);
      leads.push(lead);
    }

    console.log(`Created ${leads.length} leads`);

    // Create commission payouts for closed won deals
    const closedWonLeads = leads.filter(l => l.currentStatus === 'Closed Won');
    for (const lead of closedWonLeads) {
      await CommissionPayout.create({
        userId: lead.assignedTo,
        leadId: lead._id,
        dealAmount: lead.negotiatedPrice,
        commissionPercentage: lead.commissionPercentage,
        commissionAmount: lead.commissionAmount,
        status: 'Pending'
      });
    }

    console.log(`Created ${closedWonLeads.length} commission payouts`);

    // Create sample activities
    const activities = [];
    for (const lead of leads) {
      activities.push({
        leadId: lead._id,
        userId: lead.assignedTo,
        activityType: 'Visit',
        description: `Initial visit to ${lead.schoolName}`,
        outcome: `Met with ${lead.personMet}`,
        nextAction: 'Follow up with proposal'
      });
    }

    await Activity.insertMany(activities);
    console.log(`Created ${activities.length} activities`);

    console.log('\n=== Seed Complete ===');
    console.log('\nLogin Credentials:');
    console.log('Admin:     admin@edossier.com / password123');
    console.log('Manager:   chidi@edossier.com / password123');
    console.log('Team Lead: amina@edossier.com / password123');
    console.log('Sales Rep: emeka@edossier.com / password123');
    console.log('Sales Rep: fatima@edossier.com / password123');
    console.log('Sales Rep: kunle@edossier.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
