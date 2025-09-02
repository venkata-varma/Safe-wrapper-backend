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

    }


}


module.exports = {
    cardConnectPredefinedKeys
}