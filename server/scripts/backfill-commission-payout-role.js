require('dotenv').config();
const mongoose = require('mongoose');
const CommissionPayout = require('../models/CommissionPayout');

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const filter = {
    $or: [
      { payoutRole: { $exists: false } },
      { payoutRole: null },
      { payoutRole: '' }
    ]
  };

  const result = await CommissionPayout.updateMany(filter, {
    $set: {
      payoutRole: 'owner'
    }
  });

  console.log('Commission payout role backfill complete');
  console.log(`Matched: ${result.matchedCount}`);
  console.log(`Modified: ${result.modifiedCount}`);

  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Backfill failed:', err.message);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // no-op
    }
    process.exit(1);
  });
