const mongoose = require('mongoose');

const isTransactionsSupported = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.command({ hello: 1 });
    // Transactions are supported on replica set members and mongos.
    // In hello response, replica set members have setName; mongos has msg: 'isdbgrid'.
    return Boolean(info.setName) || info.msg === 'isdbgrid';
  } catch (e) {
    return false;
  }
};

/**
 * Runs the given function in a MongoDB transaction if supported.
 * Falls back to running without a transaction (no session) when not supported.
 *
 * @param {(ctx: { session: import('mongoose').ClientSession | null, useTransaction: boolean }) => Promise<any>} fn
 */
module.exports = async function withOptionalTransaction(fn) {
  const forceNoTx = String(process.env.MONGO_DISABLE_TRANSACTIONS || '').toLowerCase() === 'true';

  if (forceNoTx) {
    return fn({ session: null, useTransaction: false });
  }

  const supported = await isTransactionsSupported();
  if (!supported) {
    return fn({ session: null, useTransaction: false });
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn({ session, useTransaction: true });
    });
    return result;
  } finally {
    session.endSession();
  }
};
