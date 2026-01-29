exports.getSingleSquarePOSIntegrationView = asyncWrapper(async (req, res) => {
    const { accountId } = req.params
    let findExistenseOfSquarePOSIntegration;
    let data;

    const [
        squareCreds,
        squareSettings
    ] = await Promise.all([
        squarePOSCredentialsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) }),
        squarePOSIntegrationsSettingsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) })
    ])

    findExistenseOfSquarePOSIntegration = !!(squareCreds && squareSettings)

    if (!findExistenseOfSquarePOSIntegration) {
        data = { findExistenseOfSquarePOSIntegration }
    } else {

        let [
            integrationsMasterDetails,
            paymentsSummary,
            paymentStatusGroup,
            paymentTypeGroup,
            cashDrawerShiftCount
        ] = await Promise.all([

            // ---------------- Integration Details ----------------
            accountsModel.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(accountId) } },
                {
                    $lookup: {
                        from: "squareposintegrationssettings",
                        localField: "_id",
                        foreignField: "accountId",
                        as: "squareposintegrationssettings"
                    }
                },
                { $unwind: "$squareposintegrationssettings" }
            ]),

            // ---------------- Payments Summary Grid ----------------
            squarePOSPaymentsModel.aggregate([
                { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },

                {
                    $addFields: {
                        amount: { $divide: ["$amount_money.amount", 100] },
                        paymentStatus: "$status",
                        transactionType: {
                            $cond: [
                                { $gt: ["$refunded_money.amount", 0] },
                                "REFUND",
                                "PAYMENT"
                            ]
                        },
                        customerKey: {
                            last4: "$card_details.last_4",
                            brand: "$card_details.card.brand"
                        }
                    }
                },

                {
                    $group: {
                        _id: null,

                        totalTransactionsCount: { $sum: 1 },

                        settledTransactionsCount: {
                            $sum: {
                                $cond: [{ $eq: ["$paymentStatus", "COMPLETED"] }, 1, 0]
                            }
                        },

                        settledAmount: {
                            $sum: {
                                $cond: [{ $eq: ["$paymentStatus", "COMPLETED"] }, "$amount", 0]
                            }
                        },

                        refundedAmount: {
                            $sum: {
                                $cond: [{ $eq: ["$transactionType", "REFUND"] }, "$amount", 0]
                            }
                        },

                        customersSet: { $addToSet: "$customerKey" }
                    }
                },

                {
                    $project: {
                        _id: 0,
                        totalTransactionsCount: 1,
                        settledTransactionsCount: 1,
                        settledAmount: 1,
                        refundedAmount: 1,
                        customersCount: { $size: "$customersSet" }
                    }
                }
            ]),

            // ---------------- Payment Status Group ----------------
            squarePOSPaymentsModel.aggregate([
                { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]),

            // ---------------- Payment Type Group ----------------
            squarePOSPaymentsModel.aggregate([
                { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
                {
                    $addFields: {
                        transactionType: {
                            $cond: [
                                { $gt: ["$refunded_money.amount", 0] },
                                "REFUND",
                                "PAYMENT"
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$transactionType",
                        count: { $sum: 1 }
                    }
                }
            ]),

            // ---------------- Cash Drawer Shift Count ----------------
            squarePOSCashDrawerShiftsModel.countDocuments({
                accountId: new mongoose.Types.ObjectId(accountId)
            })
        ])

        const possibleTransactionStatusKeys =
            integrationsMasterDetails[0]?.squareposintegrationssettings?.transactionStatusKeys || []

        const possibleTransactionTypeKeys =
            integrationsMasterDetails[0]?.squareposintegrationssettings?.transactionTypeKeys || ["PAYMENT", "REFUND", "CASH_DRAWER_SHIFT"]

        const getStatusMappings =
            await statusMappings(paymentStatusGroup, possibleTransactionStatusKeys)

        const getTransactionTypeMappings =
            await transactionTypeMappings(paymentTypeGroup, possibleTransactionTypeKeys)

        paymentsSummary = paymentsSummary[0] || {
            totalTransactionsCount: 0,
            settledTransactionsCount: 0,
            settledAmount: 0,
            refundedAmount: 0,
            customersCount: 0
        }

        // Inject shift count as batchesCount equivalent
        paymentsSummary.batchesCount = cashDrawerShiftCount

        integrationsMasterDetails[0].locationId =
            squareCreds?.primaryKeyValues?.locationId

        data = {
            findExistenseOfSquarePOSIntegration,
            integrationDetails: integrationsMasterDetails[0],
            getTransactionTypeMappings,
            summaryGrid: paymentsSummary,
            getStatusMappings
        }
    }

    return res.status(200).json({
        status: "success",
        message: "Square POS integration dashboard data fetched successfully.",
        data
    })
})
