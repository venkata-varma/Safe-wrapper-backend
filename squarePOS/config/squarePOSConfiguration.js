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
      url: `${baseUrl}/cash-drawers/shifts/{ id }`
    },
    // getIndividualCashDrawersShift: {
    //   url: `${baseUrl}/cash-drawers/shifts/${{ id }}}`
    // },
    // getCashDrawersShiftsEvents: {
    //   url: `${baseUrl}/cash-drawers/shifts/${{ id }}/events`
    // },
    teamMembersList:{
      url: `${baseUrl}/team-members/search`
    },
    IndividualteamMember: {
      url: `${baseUrl}/team-members/{id}`
    }
  },
};

module.exports = configurations;