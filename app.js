const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongooseConnect = require('./config/dbConnection')
const app = express()
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(bodyParser.json())
// mongooseConnect.DbConnect()
const PORT = 5000;

app.use(cors());

const workOrderRoute = require('./routes/workOrderRoute')
const cronRoute = require('./cronJobs/cronjobs')

//connect to mongodb ..
// mongoose.connect('mongodb+srv://demowriter:ivvbimiv0LCiPiDY@cluster0.phcin2l.mongodb.net/corrigo-poc?w=majority&readPreference=primary&retryWrites=true&ssl=true')
// .then(()=> console.log("Database connected"))
// .catch(err => console.log(err))


app.use('/api', workOrderRoute);
app.use('/cron',cronRoute.invoicesUpdate)

module.exports = app;


//connect to server
// app.listen(PORT, ()=> console.log("Server connected") );
