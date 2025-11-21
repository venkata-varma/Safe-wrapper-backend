//Below are important keys to be stored in Card-connect settings model  while onboarding details. [Hard-coded as said]

const cardConnectPredefinedKeys = {

    transactionStatusKeys: ['Auth', 'Captured', 'Voided', 'Failure', 'Rejected', 'Declined', 'Settled', 'Processed', 'Unknown'],
    transactionTypeKeys: ['ACCOUNT VERIFY', 'AUTH REQUEST', 'CASH ADVANCE', 'REFUND', 'SALE', 'UNKNOWN', 'VOID REFUND', 'VOID SALE'],
    requiredDatapoints: {
        Transaction_Id: 'retref',
        Transaction_status: 'status',
        Amount: 'amount',
        Auth_code: 'authcode',
        Authorized_date: 'authdate',
        Batch_Id: 'batchid',
        Card_type: 'cardtype',
        Currency: 'currency',
        Funding_Id: 'fundingid',
        Funding_Transaction_id: 'fundingtxnid',
        Transaction_date: 'date',
        Transaction_type: 'type'

    },
    APIUrls: [
        {
            APIUrlFlowName: "Get Funding data for the given day",
            order: 1,
            url: "https://{{site}}.cardconnect.com/cardconnect/rest/funding?merchid={{merchantId}}&date={{date}}",
            serviceMethod: "GET",
            dataMappingPath: [
                "txns"
            ],
            primaryKeyValues: [
                "site",
                "merchantId",
                "date"
            ],
            dataPoints: [
                "fundingmasterid",
                "merchid",
                "fundingdate",
                "fundings[]",
                "fundings[].fundingmasterid",
                "adjustments[]",
                "chargebacks[]",
                "txns[].retref",
                "txns[].cardnumber",
                "txns[].cardbrand",
                "txns[].cardtype",
                "txns[].authcode",
                "txns[].authdate",
                "txns[].respcode",
                "txns[].cardproc",
                "txns[].sourcetransactionid",
                "txns[].terminalnumber",
                "txns[].invoicenumber",
                "txns[].plancode",
                "txns[].downgradereasoncodes",
                "txns[].fundingid",
                "txns[].fundingtxnid",
                "txns[].status",
                "txns[].amount",
                "txns[].currency",
                "txns[].interchangepercentfee",
                "txns[].interchangeunitfee",
                "txns[].date",
                "txns[].type",
                "txns[].batchid"
            ],
            paginationRequired: true,
            rateLimit: {
                "status": true,
                "limit": 20
            },
            filteredReferenceId: "retref",
            statusKey: "status",
            status: "active",
        }
    ]


}


module.exports = {
    cardConnectPredefinedKeys
}