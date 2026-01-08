const axios = require('axios');
const squarePOSAPIConfiguration = require('../config/squarePOSConfiguration');

/**
 * Generates standard headers for Square API requests
 */
const getSquareHeaders = (accessToken) => ({
    Authorization: `Bearer ${accessToken}`,
    'Square-Version': '2024-12-18',
    'Content-Type': 'application/json'
});

/**
 * Fetch all team members using the Search endpoint
 */
exports.fetchTeamMembers = async (accessToken) => {
    const url = squarePOSAPIConfiguration?.SquarePOS?.teamMembersList?.url;
    if (!url) return [];
    const { data } = await axios.post(url, {}, { headers: getSquareHeaders(accessToken) });
    return data?.team_members || [];
};

/**
 * Fetch details for a specific team member
 */
exports.fetchTeamMemberById = async (memberId, accessToken) => {
    let urlTemplate = squarePOSAPIConfiguration?.SquarePOS?.IndividualteamMember?.url;
    if (!urlTemplate || !memberId) return null;

    const url = urlTemplate.replace(/{+ ?id ?}+/g, memberId);
    const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
    return data?.team_member || null;
};

/**
 * Fetch all payments
 */
exports.fetchPayments = async (accessToken) => {
    const url = squarePOSAPIConfiguration?.SquarePOS?.getPayments?.url;
    if (!url) return [];
    const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
    return data?.payments || [];
};

/**
 * Fetch all locations
 */
exports.fetchLocations = async (accessToken) => {
    const url = squarePOSAPIConfiguration?.SquarePOS?.getLocations?.url;
    if (!url) return [];
    const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
    return data?.locations || [];
};

/**
 * Fetch list of shifts for a specific location
 */
exports.fetchCashDrawerShifts = async (locationId, accessToken) => {
    const urlTemplate = squarePOSAPIConfiguration?.SquarePOS?.getCashDrawersShitfts?.url;
    if (!urlTemplate) return [];

    const finalUrl = urlTemplate.replace(/{ ?locationid ?}/g, locationId);
    const response = await axios.get(finalUrl, { headers: getSquareHeaders(accessToken) });
    return response.data?.cash_drawer_shifts || response.data?.items || [];
};

/**
 * Fetch details for a specific cash drawer shift
 */
exports.fetchIndividualCashDrawersShift = async (shiftId, accessToken) => {
    let urlTemplate = squarePOSAPIConfiguration?.SquarePOS?.getIndividualCashDrawersShift?.url;
    if (!urlTemplate || !shiftId) return null;

    const url = urlTemplate.replace(/{+ ?shiftid ?}+/g, shiftId);
    const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
    return data?.cash_drawer_shift || null;
};

/**
 * Fetch specific events (pay-in/out) for a shift
 */
exports.fetchShiftEvents = async (shiftId, accessToken) => {
    let urlTemplate = squarePOSAPIConfiguration?.SquarePOS?.getCashDrawersShiftsEvents?.url;
    if (!urlTemplate || !shiftId) return [];

    const url = urlTemplate.replace(/{+ ?shiftid ?}+/g, shiftId);
    const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
    return data?.events || [];
};


/* --- Helper Functions --- */

// async function fetchTeamMembers(accessToken) {
//     const url = squarePOSAPIConfiguration?.SquarePOS?.teamMembersList?.url;
//     if (!url) return [];

//     // Square Team API requires a POST to /search to list members
//     const { data } = await axios.post(url, {}, {
//         headers: getSquareHeaders(accessToken)
//     });

//     return data?.team_members || [];
// }

// async function fetchPayments(accessToken) {
//     const url = squarePOSAPIConfiguration?.SquarePOS?.getPayments?.url;
//     if (!url) return [];
//     const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
//     return data?.payments || [];
// }

// async function fetchLocations(accessToken) {
//     const url = squarePOSAPIConfiguration?.SquarePOS?.getLocations?.url;
//     if (!url) return [];
//     const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
//     return data?.locations || [];
// }

// async function fetchCashDrawerShifts(locationId, accessToken) {
//     const urlTemplate = squarePOSAPIConfiguration?.SquarePOS?.getCashDrawersShitfts?.url;

//     if (!urlTemplate) return [];

//     const finalUrl = urlTemplate.replace(/{ ?locationid ?}/g, locationId);
//     console.log("Final URL for Cash Drawer Shifts:", finalUrl)

//     const response = await axios.get(finalUrl, {
//         headers: getSquareHeaders(accessToken)
//     });

//     // Handle the empty {} or { cash_drawer_shifts: [] } cases safely
//     return response.data?.cash_drawer_shifts || response.data?.items || [];
// }

// async function fetchIndividualCashDrawersShift(shiftId, accessToken) {
//     let url = squarePOSAPIConfiguration?.SquarePOS?.getIndividualCashDrawersShift?.url;
//     // Note: fixing the double brackets {{ shiftid }} from your config if necessary
//     if (!url || !shiftId) return null;

//     url = url.replace(/{+ ?shiftid ?}+/g, shiftId);

//     const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
//     return data?.cash_drawer_shift || null;
// }

// async function fetchShiftEvents(shiftId, accessToken) {
//     let url = squarePOSAPIConfiguration?.SquarePOS?.getCashDrawersShiftsEvents?.url;
//     // Note: fixing the double brackets {{ shiftid }} from your config if necessary
//     if (!url || !shiftId) return [];

//     url = url.replace(/{+ ?shiftid ?}+/g, shiftId);

//     const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
//     return data?.events || [];
// }

// async function fetchIndividualTeamMember(memberId, accessToken) {
//     let url = squarePOSAPIConfiguration?.SquarePOS?.IndividualteamMember?.url;
//     if (!url || !memberId) return null;

//     url = url.replace('{id}', memberId);

//     const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
//     return data?.team_member || null;
// }

// function getSquareHeaders(accessToken) {
//     return {
//         Authorization: `Bearer ${accessToken}`,
//         'Square-Version': '2024-12-18',
//         'Content-Type': 'application/json'
//     };
// }
