


const moment = require('moment');

function getSixWeeksSalesFunction() {
  const sixWeeksSales = [];

  for (let i = 5; i >= 0; i--) {
    const fromDate = moment.utc().startOf('isoWeek').subtract(i, 'weeks');
    const toDate = moment.utc().endOf('isoWeek').subtract(i, 'weeks');

    sixWeeksSales.push({
      fromDate: fromDate.toDate().toISOString(),
      toDate: toDate.toDate().toISOString()
    });
  }


  return sixWeeksSales;
}

module.exports = {
  getSixWeeksSalesFunction
};
