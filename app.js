const express = require("express");
const http = require("http");

const app = express();

const server = http.createServer(app);
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const mongooseConnect = require("./config/dbConnection");

// const {insertGlobalConstants}=require('./controllers/workOrdersController')
// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Database Connection
mongooseConnect.DbConnect();

// Routes
const accountsRoute = require("./customer/routes/accountsRoute");
const usersRoute = require("./customer/routes/usersRoute");
const chatRoute = require("./customer/routes/chatRoute");
const errorcontroller = require("./customer/controllers/errorcontroller");
const webHooksRoute = require("./customer/routes/webHooksRoute");
const webhookCrons = require("./customer/controllers/webhookCronControllers");
const integrationCrons = require("./cardConnect/controllers/cardConnectCronScheduleController");

const squarePOSDataPointsRoute = require("./squarePOS/routes/squarePOSDataPointsRoute");

//Super Admin Routes.

const SuperAdminAccountRoutes = require("./superAdmin/routes/superAdminAccounts");
const superAdminUserRoutes = require("./superAdmin/routes/userRoute");
const superAdminWebhookRoutes = require("./superAdmin/routes/superAdminWebhookRoutes");
const superAdminWebhookOperations = require("./superAdmin/routes/webhookOperationRoutes");
const cardConnectIntegrationsMasterRoute = require("./cardConnect/routes/cardConnectIntegrationsMasterRoute");

const cardConnectIntegrationsMasterDataPointsRoute = require("./cardConnect/routes/cardConnectIntegrationsMasterDataPointsRoute");

//Square POS
const SquarePOSRoutes = require("./squarePOS/routes/squarePOSIntegrationRoute");
const squarePOSScheduleCronJobs = require("./squarePOS/controllers/squarePOSCronScheduleController");

//Provide the static images
app.use("/static", express.static(path.join(__dirname, "assets")));

app.use("/api/merchants/accounts", accountsRoute);
app.use("/api/merchants/users", usersRoute);
app.use("/api/merchants/machines", webHooksRoute);
app.use("/api/square-pos", SquarePOSRoutes);
app.use("/api/square-pos/data-points", squarePOSDataPointsRoute);
app.use("/api/chat", chatRoute);

//Super Admin
app.use("/api/accounts", SuperAdminAccountRoutes);
app.use("/api/users", superAdminUserRoutes);
app.use("/api/machines", superAdminWebhookRoutes);
app.use("/api/webhook", superAdminWebhookOperations);
app.use(
  "/api/card-connect/integrations-master",
  cardConnectIntegrationsMasterRoute,
);

app.use(
  "/api/card-connect/data-points",
  cardConnectIntegrationsMasterDataPointsRoute,
);

// Start of swagger configuration

const yaml = require("js-yaml");
let swaggerjsdoc = require("swagger-jsdoc");
let swaggerexpressui = require("swagger-ui-express");
let fs = require("fs");

app.use(express.static(path.join(__dirname, "swaggerDocumentationFiles")));
//const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8'));
const swaggerDocument = yaml.load(
  fs.readFileSync(
    path.join(__dirname, "swaggerDocumentationFiles", "swagger.yaml"),
    "utf8",
  ),
);

app.use(
  "/api-docs",
  swaggerexpressui.serve,
  swaggerexpressui.setup(swaggerDocument, {
    customCssUrl: "/swagger-custom.css",
  }),
);

// End of swagger configuration

// squarePOSScheduleCronJobs.squarePOSScheduleCronJobs()
webhookCrons.webhookScheduleCronJobs();
// integrationCrons.cardConnectScheduleCronJobs()

// Error Handling Middleware (optional)
app.use(errorcontroller);

const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const { setIO } = require("./socket/socket");

setIO(io);

let onlineUsers = require("./socket/onlineUsersMap");
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("registerUser", (userId) => {
    console.log("REGISTER EVENT RECEIVED:", userId);

    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));

    console.log("Online Users:", onlineUsers);
  });
  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    console.log("Online Users:", onlineUsers);
  });
});
server.listen(8201, () => {
  console.log("Server is working on port 8201");
});

// app.listen(8201, () => {
//     console.log(`Server is working on port 8201`);
// });

module.exports = app;
