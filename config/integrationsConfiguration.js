let currentDate = new Date();
const configurations = {
    CPD :{
        workOrderSearch :{
            URL : 'https://am-api.corrigopro.com/Direct/api/workOrder/search',
            body : {
                "Parameters": {
                  //"WorkOrderNumber":"POS4L20001", /*Search by work order number
                  /* Search by'Created', 'AcknowledgeBy', 'OnSiteBy', 'DueDate', 'LastUpdate'*/
                  "Created": {
                    "From": new Date(currentDate.setDate(currentDate.getDate() - 28)),
                    "To": new Date()
                    // "To": "2024-02-14T24:00:00.000Z"
                  }
                  /*Search by work order status -> New,Accepted,Recalled,Rejected,CheckedIn,Paused,CheckedOut,OnHold,Verified,NeedsCompletionDetails*/
                  //"Statuses": [ "Accepted","CheckedIn","Rejected","CheckedOut","Verified" ],
                  //,"CustomerId" :"90256"
                },
                "MessageId": "f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a"
              },
        },
        getWorkOrder : {
          URL : 'https://am-api.corrigopro.com/Direct/api/workOrder?'
        }
    },
    DF : {
      createWorkOrder :{
        URL : 'https://api.dataforma.com/dflowslope-api/workorders',
        headers: { 
          'df-auth': 'ad7412b5-1928-49b9-a237-aa43d764bec4', 
          'df-servicecode': 'mds552', 
          'Content-Type': 'application/json', 
          'Cookie': 'AWSALB=DGf1rqUADBR0x43HDX6TmdYgk92IjmyK3W1bQeNnFzbO0+GDi1NUNmB0zQlOVOjt+BNKwErFLx2+ecCKc0uB0ZWQDjvtV1aSUXdWvBvtwM4k1AthfVVWJryDJ2GP; AWSALBAPP-0=_remove_; AWSALBAPP-1=_remove_; AWSALBAPP-2=_remove_; AWSALBAPP-3=_remove_; AWSALBCORS=DGf1rqUADBR0x43HDX6TmdYgk92IjmyK3W1bQeNnFzbO0+GDi1NUNmB0zQlOVOjt+BNKwErFLx2+ecCKc0uB0ZWQDjvtV1aSUXdWvBvtwM4k1AthfVVWJryDJ2GP'
        },
        body : {          
            "assignedTo": "",
            "budgetAmount": 0,
            "budgetNotes": "",
            "budgetedProposedContactId": 0,
            "budgetedProposedStatus": "NONE",
            "buildingId": 1715,
            "contractAmount": 0,
            "contractNotes": "",
            "customId": 0,
            "customerPurchaseOrderId": 0,
            "departmentId": 0,
            "divisionId": 1, 
            "doNotExceed": "",
            "estimatorId": 0,
            "foremanId": 0,
            "invoiceToCustomerId": 2238,
            "invoiceToText": "",
            "invoiceType": "EXTERNAL_CHARGE",
            "locationId": 0,
            "notes": "",
            "numberAlt": "",
            "numberClient": "",
            "questionsToId": 0,
            "reportToAltId": 0,
            "reportToId": 0,
            "reportedById": 5515,
            "runningNotes": "",
            "salesmanagerId": 0,
            "salespersonId": 0,
            "sourceListId": 0,
            "status": "IN_PROGRESS",
            "subsourceListId": 0,
            "subtypeListId": 0,
            "typeListId": 687,
            "workDescription": "DevRabbit Testing WorkOrders (Ignore)."          
          },
      },
      getWorkOrderById : {
        URL : 'https://api.dataforma.com/dflowslope-api/workorders/',
        headers: { 
          'df-auth': 'ad7412b5-1928-49b9-a237-aa43d764bec4', 
          'df-servicecode': 'mds552', 
          'Content-Type': 'application/json', 
          'Cookie': 'AWSALB=DGf1rqUADBR0x43HDX6TmdYgk92IjmyK3W1bQeNnFzbO0+GDi1NUNmB0zQlOVOjt+BNKwErFLx2+ecCKc0uB0ZWQDjvtV1aSUXdWvBvtwM4k1AthfVVWJryDJ2GP; AWSALBAPP-0=_remove_; AWSALBAPP-1=_remove_; AWSALBAPP-2=_remove_; AWSALBAPP-3=_remove_; AWSALBCORS=DGf1rqUADBR0x43HDX6TmdYgk92IjmyK3W1bQeNnFzbO0+GDi1NUNmB0zQlOVOjt+BNKwErFLx2+ecCKc0uB0ZWQDjvtV1aSUXdWvBvtwM4k1AthfVVWJryDJ2GP'
        },
      },
      updateWorkOrder : {
        URL : 'https://api.dataforma.com/dflowslope-api/workorders/',
      },
      searchWorkOrderType : {
        URL : 'https://api.dataforma.com/dflowslope-api/workorders/types/search',
        body : {}
      },
      searchbuildings: {
        URL: 'https://api.dataforma.com/dflowslope-api/buildings?limit=5000'
      }
    },

    SNOW : {
      getAllIncidents :{
        URL : 'https://dev276358.service-now.com/api/now/table/incident',
      },
      getIncidentById:{
        URL:'https://dev276358.service-now.com/api/now/table/incident'
      },
      updateIncidentById:{
        URL:'https://dev276358.service-now.com/api/now/table/incident'
      },
      postIncident:{
        URL:'https://dev276358.service-now.com/api/now/table/incident'
      }
    },

    CYS : {
      createWorkOrder : {
        URL : 'https://cyriousapi.dev.isyncrabbit.com/create-estimate',
        // URL : 'http://192.168.1.31:8091/create-estimate'
      },
      getWorkOrder : {
        URL : 'https://cyriousapi.dev.isyncrabbit.com/get-estimate',
        // URL : 'http://192.168.1.31:8091/get-estimate'
      },
      updateWorkOrder: {
        URL : 'https://cyriousapi.dev.isyncrabbit.com/update-estimate',
        // URL : 'http://192.168.1.31:8091/update-estimate'
      }
    }
}

module.exports = configurations