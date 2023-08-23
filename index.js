const express = require("express")
const {open} = require("sqlite")
const sqlite3 = require("sqlite3")
const path = require("path");
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json())

const dbPath = path.join(__dirname,"tempform.db");
let db = null;
const InitializeDBAndServer = async()=>{
    try{
        db = await open({
            filename : dbPath,
            driver : sqlite3.Database,
        })
        app.listen(3000, ()=>{
            console.log("Server is running on https://localhost:3000")
        }) 

    }catch(err){
        console.log(`DB ERROR :${err} `)
        process.exit(1)
    }
}
InitializeDBAndServer();

app.get('/', (request, response) => {
    // Handle the GET request here
    response.send('Hello, this is the root path!');
  });


app.post('/updatetempform/', async (request, response) => {
        
    
    const { calibrationPOstQuery, standardUsed , observations} = request.body;

    await db.run('PRAGMA foreign_keys = ON');

    const {
        srfNo, equipmentNo, equipmentCondition, dateOfCalibration, recommendedCalibrationDue, calibrationPoints,
        make, model, srNoIdNo, locationDepartment, range, resolution, accuracy, unitUnderMeasurement, temperature,
        humidity, sopNumber, remarks, calibratedBy, checkedBy
    } = calibrationPOstQuery;

    // Calibration Query
    const calibrationPost = `
        INSERT INTO calibration_data(srfNo, equipmentNo, equipmentCondition, dateOfCalibration, recommendedCalibrationDue, calibrationPoints,
            make, model, srNoIdNo, locationDepartment, range, resolution, accuracy, unitUnderMeasurement, temperature,
            humidity, sopNumber, remarks, calibratedBy, checkedBy)
        VALUES (?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?,?, ?, ?)`;

    const dbResponse1 = await db.run(calibrationPost);
    const calibrationId = dbResponse1.lastID;

    // StandrardUsed Query
    const {
        instrumentName, instrumentSrNo, certificateNo, calibrationDueOn
    } = standardUsed;

    const standardUsedPost = `
        INSERT INTO standard_used(calibration_data_id, instrumentName, instrumentSrNo, certificateNo, calibrationDueOn)
        VALUES (?, ?, ?, ?, ?)`;

    const dbResponse2 = await db.run(standardUsedPost);
    const standardUsedId = dbResponse2.lastID;

    // Observation Query

    for (const observationRow of observations) {
        const observationRowNumber = observationRow.observation_row_number;
        const observationData = observationRow.observation_data;

        const observationPost = `
            INSERT INTO observation_rows(calibration_data_id, observation_row_number, observation_data)
            VALUES (${calibrationId}, ${observationRowNumber}, '${observationData}')`;

        await db.run(observationPost);
    }

    response.send({ calibrationId, standardUsedId , observations});

})


