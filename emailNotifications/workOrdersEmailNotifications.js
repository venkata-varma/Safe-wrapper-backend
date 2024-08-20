exports.oneWeekWorkOrderEmailNotifcation = async(source, destination, integrationSourceAndDestinationStatus, failedCPDWorkOrders, integrationsExceptionsCount, sourceStatusTotalCount, destinationStatusTotalCount, workOrdersFromDate, workOrdersToDate, sourceServiceProviderName, destinationServiceProviderName,integrationTitle,IntegrationStatusMappingKeys) => {
  const html =  `
     <h3 class="text-left">Integration: <span class="text-gray fs-6"> ${integrationTitle} </span></h3>
        <div class="stats">
            <div class="stat">${sourceServiceProviderName} Work Orders<br><strong>${sourceStatusTotalCount}</strong></div>
            <div class="stat">${destinationServiceProviderName} Work Orders<br><strong>${destinationStatusTotalCount}</strong></div>
            <div class="stat failed">Failed Work Orders<br><strong>${failedCPDWorkOrders}</strong></div>
            <div class="stat exceptions">Exceptions<br><strong>${integrationsExceptionsCount}</strong></div>
        </div>
        <table>
            ${await oneWeekWorkOrderDetails(source, destination, integrationSourceAndDestinationStatus, failedCPDWorkOrders, integrationsExceptionsCount,IntegrationStatusMappingKeys)}
            <tfoot>
                <tr>
                    <td colspan="1">Total</td>
                    <td>${sourceStatusTotalCount}</td>
                    <td>${destinationStatusTotalCount}</td>                   
                    <td>${isNaN(Math.round((destinationStatusTotalCount/sourceStatusTotalCount)*100)) ? '0%' : Math.round((destinationStatusTotalCount/sourceStatusTotalCount)*100) + '%'}</td>
                </tr>
            </tfoot>
        </table>`;
  return html;
};

const oneWeekWorkOrderDetails = async(source, destination, integrationSourceAndDestinationStatus, failedCPDWorkOrders, integrationsExceptionsCount,IntegrationStatusMappingKeys) => {
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

  // Assign missing statuses from IntegrationStatusMappingKeys to integrationSourceAndDestinationStatus
  for (const [key, value] of Object.entries(IntegrationStatusMappingKeys)) {
    if (!integrationSourceAndDestinationStatus.sourceStatus.find(item => item.status === value)) {
      integrationSourceAndDestinationStatus.sourceStatus.push({ status: value, count: 0 });
    }
  }
  // Calculate percentages
  for (let i = 0; i < integrationSourceAndDestinationStatus.sourceStatus.length; i++) {
    const sourceItem = integrationSourceAndDestinationStatus.sourceStatus[i];
    
    let statusMappingValue = Object.keys(IntegrationStatusMappingKeys).find(key => IntegrationStatusMappingKeys[key] === sourceItem.status);
    const destinationItem = integrationSourceAndDestinationStatus.destinationStatus.find(item => item.status === statusMappingValue) || { status: '', count: 0 };
    
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