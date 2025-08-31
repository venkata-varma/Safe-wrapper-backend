
exports.generateDateRange=(days)=> {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');

        dates.push(`${yyyy}${mm}${dd}`);
    }

    return dates;
}

// utils/helpers.js
exports.generateDateArray = (fromDate, toDate) => {
  const parseUTC = (s) => new Date(`${s}T00:00:00.000Z`);
  let start = parseUTC(fromDate);   // earliest
  let end   = parseUTC(toDate);     // latest

  const out = [];
  while (end >= start) {
    const y = end.getUTCFullYear();
    const m = String(end.getUTCMonth() + 1).padStart(2, '0');
    const d = String(end.getUTCDate()).padStart(2, '0');
    out.push(`${y}${m}${d}`);
    end.setUTCDate(end.getUTCDate() - 1); // step back one day
  }
  return out;
};
