function getSixWeeksSalesFunction() {
    const now = new Date();
    const sixWeeksSales = [];
  
    for (let i = 0; i < 6; i++) {
      const toDate = new Date(now.getTime() - (7 * i * 24 * 60 * 60 * 1000) - 0.001);
      const fromDate = new Date(toDate.getTime() - (7 * 24 * 60 * 60 * 1000) + 1);
      const format = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, -1);
      sixWeeksSales.unshift({ fromDate: format(fromDate), toDate: format(toDate) });
    }
  
    return sixWeeksSales;
  }
  
  module.exports={
    getSixWeeksSalesFunction
  }