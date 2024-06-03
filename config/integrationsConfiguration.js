const configurations = {
    CPD :{
        workOrderSearch :{
            URL : 'https://am-api.corrigopro.com/Direct/api/workOrder/search',
            body : {
                "Parameters": {
                  //"WorkOrderNumber":"POS4L20001", /*Search by work order number
                  /* Search by'Created', 'AcknowledgeBy', 'OnSiteBy', 'DueDate', 'LastUpdate'*/
                  "Created": {
                    "From": "2024-02-06T00:00:00Z",
                  //   "To": new Date()
                    "To": "2024-02-14T24:00:00.000Z"
                  }
                  /*Search by work order status -> New,Accepted,Recalled,Rejected,CheckedIn,Paused,CheckedOut,OnHold,Verified,NeedsCompletionDetails*/
                  // ,"Statuses": [ "Accepted","CheckedIn" ]
                  //,"CustomerId" :"90256"
                },
                "MessageId": "f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a"
              },
        }
    }
}

module.exports = configurations