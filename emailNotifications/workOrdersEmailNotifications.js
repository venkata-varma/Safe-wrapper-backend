exports.oneWeekWorkOrderEmailNotifcation = async(source, destination, integrationSourceAndDestinationStatus, failedCPDWorkOrders, integrationsExceptionsCount, sourceStatusTotalCount, destinationStatusTotalCount, workOrdersFromDate, workOrdersToDate, sourceServiceProviderName, destinationServiceProviderName,serviceProviderComapanyLogo,integrationTitle) => {
  const html =  `<!DOCTYPE html>
<html lang="en">

<body>
    <div class="container">
     <h3 class="text-left">Integration: <span class="text-gray fs-6"> ${integrationTitle} </span></h3>
        <div class="stats">
            <div class="stat">${sourceServiceProviderName} Work Orders<br><strong>${sourceStatusTotalCount}</strong></div>
            <div class="stat">${destinationServiceProviderName} Work Orders<br><strong>${destinationStatusTotalCount}</strong></div>
            <div class="stat failed">Failed Work Orders<br><strong>${failedCPDWorkOrders}</strong></div>
            <div class="stat exceptions">Exceptions<br><strong>${integrationsExceptionsCount}</strong></div>
        </div>
        <table>
            ${await oneWeekWorkOrderDetails(source, destination, integrationSourceAndDestinationStatus, failedCPDWorkOrders, integrationsExceptionsCount)}
            <tfoot>
                <tr>
                    <td colspan="1">Total</td>
                    <td>${sourceStatusTotalCount}</td>
                    <td>${destinationStatusTotalCount}</td>                   
                    <td>${isNaN(Math.round((destinationStatusTotalCount/sourceStatusTotalCount)*100)) ? '0%' : Math.round((destinationStatusTotalCount/sourceStatusTotalCount)*100) + '%'}</td>
                </tr>
            </tfoot>
        </table>
        </div>
</body>
</html>`;
  return html;
};

const oneWeekWorkOrderDetails = async(source, destination, integrationSourceAndDestinationStatus, failedCPDWorkOrders, integrationsExceptionsCount) => {
  let tableContent = `
    <thead>
        <tr>
            <th>WORK ORDER STATUS</th>
            <th>${source}</th>
            <th>${destination}</th>
            <th>%</th>
        </tr>
    </thead>
    <tbody>
  `;

  const maxLength = Math.max(
    integrationSourceAndDestinationStatus.sourceStatus.length,
    integrationSourceAndDestinationStatus.destinationStatus.length
  );

  for (let i = 0; i < maxLength; i++) {
    const sourceItem = integrationSourceAndDestinationStatus.sourceStatus[i] || { status: '', count: 0 };
    const destinationItem = integrationSourceAndDestinationStatus.destinationStatus[i] || { status: '', count: 0 };

    const percentage = sourceItem.count === 0 ? 0 : (destinationItem.count / sourceItem.count) * 100;

    tableContent += `
      <tr>
          <td>${sourceItem.status}</td>
          <td>${sourceItem.count}</td>
          <td>${destinationItem.count}</td>
          <td>${percentage.toFixed(2)}%</td>
      </tr>
    `;
  }

  tableContent += '</tbody>';
  return tableContent;
};