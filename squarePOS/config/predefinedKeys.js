//Below are important keys to be stored in Card-connect settings model  while onboarding details. [Hard-coded as said]

const squarePOSPredefinedKeys = {

    cashDrawerShiftsStatuses: ["OPEN", "ENDED", "CLOSED"],
    cashDrawerEventType: ["NO_SALE", "CASH_TENDER_PAYMENT", "OTHER_TENDER_PAYMENT", "CASH_TENDER_CANCELLED_PAYMENT", "OTHER_TENDER_CANCELLED_PAYMENT", "PAID_IN", "PAID_OUT"],
    cardPaymentStatuses: ["APPROVED", "PENDING", "COMPLETED", "CANCELLED", "FAILED"]




}


module.exports = {
    squarePOSPredefinedKeys
}