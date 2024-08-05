//Import the mongoose module
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);

class Database {
  dbConnection = mongoose.connection;

  constructor() {
    try {
      this.dbConnection
        .on("open", console.info.bind(console, "Database connection: open"))
        .on("close", console.info.bind(console, "Database connection: close"))
        .on(
          "disconnected",
          console.info.bind(console, "Database connection: disconnecting")
        )
        .on(
          "disconnected",
          console.info.bind(console, "Database connection: disconnected")
        )
        .on(
          "reconnected",
          console.info.bind(console, "Database connection: reconnected")
        )
        .on(
          "fullsetup",
          console.info.bind(console, "Database connection: fullsetup")
        )
        .on("all", console.info.bind(console, "Database connection: all"))
        .on("error", console.error.bind(console, "MongoDB connection: error:"));
    } catch (error) {
      console.error(error);
    }
  }

  DbConnect = async () => {
    return new Promise((resolve) => {
      const userNameDB = process.env.DATABASE.replace(
        "<username>",
        process.env.DATABASE_USERNAME
      );

      const dbPassword = userNameDB.replace(
        "<password>",
        process.env.DATABASE_PASSWORD
      );

      const connectionParams = {
        useNewUrlParser: true,
        useUnifiedTopology: true
      };

      mongoose.connect(dbPassword).then(() => {
        console.log(`MongoDB Atlas database connected successfully ...`);
        resolve();
      });
    });
  };


  async close() {
    try {
      await this.dbConnection.close();
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = new Database();
