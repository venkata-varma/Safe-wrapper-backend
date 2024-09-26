
/**
 * 
 * @param {*} integrationObject have the integration details.
 * @returns Based on to service provider return the requires statuses to search the WO in CPD.
 */
exports.WOSearchByStatuses = async (integrationObject) => {
    if (integrationObject.to === "CYS") {
        return ["New"]
    }
    else {
        return [
            "New",
            "Accepted",
            "Rejected",
            "Recalled",
            "CheckedIn",
            "Paused",
            "OnHold",
            "CheckedOut",
            "Verified",
            "NeedsCompletionDetails"
        ]
    }

};