let currentDate = new Date();
const configurations = {
    CPD :{
        workOrderSearch :{
            URL : 'https://am-api.corrigopro.com/Direct/api/workOrder/search',
        },
        getWorkOrder : {
          URL : 'https://am-api.corrigopro.com/Direct/api/workOrder?'
        }
    },
    DF : {
      createWorkOrder :{
        URL : 'https://api.dataforma.com/dflowslope-api/workorders',
      },
      getWorkOrderById : {
        URL : 'https://api.dataforma.com/dflowslope-api/workorders/',
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
        URL : 'https://dev249675.service-now.com/api/now/table/incident',
      },
      getIncidentById:{
        URL:'https://dev249675.service-now.com/api/now/table/incident'
      },
      updateIncidentById:{
        URL:'https://dev249675.service-now.com/api/now/table/incident'
      },
      postIncident:{
        URL:'https://dev249675.service-now.com/api/now/table/incident'
      }
    },

    CYS : {
      createWorkOrder : {
        // URL : 'https://cyriousapi.dev.isyncrabbit.com/create-estimate',
        URL : 'http://96.64.121.91:8091/create-estimate'
      },
      getWorkOrder : {
        // URL : 'https://cyriousapi.dev.isyncrabbit.com/get-estimate',
        URL : 'http://96.64.121.91:8091/get-estimate'
      },
      updateWorkOrder: {
        // URL : 'https://cyriousapi.dev.isyncrabbit.com/update-estimate',
        URL : 'http://96.64.121.91:8091/update-estimate'
      }
    }
}

module.exports = configurations