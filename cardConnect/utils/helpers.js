
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

