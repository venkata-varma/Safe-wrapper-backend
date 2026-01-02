let currentDate = new Date();

const isDev = process.env.NODE_ENV === 'dev';
console.log(isDev, "Dev");

const baseUrl = isDev
  ? "https://connect.squareupsandbox.com/v2"
  : "https://connect.squareup.com/v2";

const configurations = {
  SquarePOS: {
    authUrl: {
      url: `${baseUrl}/merchants`
    },
    getPayments: {
      url: `${baseUrl}/payments`,
    },
    getLocations: {
      url: `${baseUrl}/locations`
    },
    getCashDrawersShitfts: {
      url: `${baseUrl}/cash-drawers/shifts?location_id={locationid}`
    },
    getIndividualCashDrawersShift: {
      url: `${baseUrl}/cash-drawers/shifts/{shiftid}`
    },
    getCashDrawersShiftsEvents: {
      url: `${baseUrl}/cash-drawers/shifts/{shiftid}/events`
    },
    IndividualteamMember: {
      url: `${baseUrl}/team-members/{id}`
    },
    teamMembersList: {
      url: `${baseUrl}/team-members/search`
    },
  },
};

module.exports = configurations;