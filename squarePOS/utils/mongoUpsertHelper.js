/**
 * Deterministic upsert:
 * - Creates ONLY if record does not exist
 * - Updates ONLY if record exists
 */
async function upsertByReference({
    model,
    accountId,
    referenceId,
    payload,
    userId,
    cronId
}) {
    // 1️⃣ Check existence first
    const existing = await model.findOne(
        { accountId, referenceId },
        { _id: 1 }
    ).lean();

    // 2️⃣ Perform write
    await model.updateOne(
        { accountId, referenceId },
        {
            $setOnInsert: {
                accountId,
                referenceId,
                createdBy: userId,
                squarePOSIntegrationsCronIdCreate: cronId
            },
            $set: {
                ...payload,
                updatedBy: userId,
                squarePOSIntegrationsCronIdUpdate: cronId
            }
        },
        { upsert: true }
    );

    // 3️⃣ Deterministic result
    return existing ? 'UPDATED' : 'CREATED';
}


module.exports = { upsertByReference };
