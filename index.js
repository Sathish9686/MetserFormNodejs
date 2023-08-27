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

        await db.run('PRAGMA foreign_keys = ON');

        await db.exec(`
            CREATE TABLE IF NOT EXISTS calibration_data (
                id INTEGER PRIMARY KEY,
                srfNo TEXT,
                equipmentNo TEXT,
                equipmentCondition TEXT,
                dateOfCalibration DATE,
                recommendedCalibrationDue DATE,
                calibrationPoints TEXT,
                make TEXT,
                model TEXT, 
                srNoIdNo TEXT, 
                locationDepartment TEXT, 
                range TEXT, 
                resolution TEXT, 
                accuracy TEXT, 
                unitUnderMeasurement TEXT, 
                temperature TEXT,
                humidity TEXT, 
                sopNumber TEXT, 
                remarks TEXT, 
                calibratedBy TEXT,
                checkedBy TEXT
            );

            CREATE TABLE IF NOT EXISTS standard_used (
                id INTEGER PRIMARY KEY,
                calibration_data_id INTEGER,
                instrumentName TEXT, 
                instrumentSrNo TEXT, 
                certificateNo TEXT, 
                calibrationDueOn DATE,
                FOREIGN KEY (calibration_data_id) REFERENCES calibration_data (id)
            );

            CREATE TABLE IF NOT EXISTS observation_rows (
                id INTEGER PRIMARY KEY,
                calibration_data_id INTEGER,
                observation_row_number INTEGER,
                observation_data TEXT,
                FOREIGN KEY (calibration_data_id) REFERENCES calibration_data (id)
            );
        `);

        app.listen(3000, ()=>{
            console.log("Server is running on https://localhost:3000")
        }) 

    }catch(err){
        console.log(`DB ERROR :${err} `)
        process.exit(1)
    }
}
InitializeDBAndServer();

app.get('/getdata', async (request, response) => {
    const getdataquery = `
    SELECT
        c.*,
        su.instrumentName,
        su.instrumentSrNo,
        su.certificateNo,
        su.calibrationDueOn,
        o.observation_row_number,
        o.observation_data
    FROM calibration_data c
    LEFT JOIN standard_used su ON c.id = su.calibration_data_id
    LEFT JOIN observation_rows o ON c.id = o.calibration_data_id
    ORDER BY c.id;`;
    const allquery = await db.all(getdataquery)
    response.send(allquery);
  });


app.post('/updatetempform/', async (request, response) => {
       console.log(request.body) 
    
    const { calibrationPOstQuery, standardUsedForCalibration , observations} = request.body;
    

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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; 

    const dbResponse1 = await db.run(calibrationPost, Object.values(calibrationPOstQuery));
    const calibrationId = dbResponse1.lastID;

    // StandrardUsed Query
    for (const eachstandardused of standardUsedForCalibration ){
        const {
            instrumentName, instrumentSrNo, certificateNo, calibrationDueOn
        } = eachstandardused; 

    const standardUsedPost = `
        INSERT INTO standard_used(calibration_data_id, instrumentName, instrumentSrNo, certificateNo, calibrationDueOn)
        VALUES (?, ?, ?, ?, ?)`;
        
    const dbResponse2 = await db.run(standardUsedPost, [calibrationId, ...Object.values(eachstandardused)]);
    const insertedStandardUsedId  = dbResponse2.lastID;
    }
    // Observation Query

    for (const observationRow of observations) {
        const observationRowNumber = Object.keys(observationRow)[0];
        const observationData = observationRow[observationRowNumber];

        const observationPost = `
            INSERT INTO observation_rows(calibration_data_id, observation_row_number, observation_data)
            VALUES (?, ?, ?)`;

        const dbResponse3 = await db.run(observationPost,[calibrationId,observationRowNumber,observationData]);
        const observationId = dbResponse3.lastID;
    }

    response.send({ calibrationId, insertedStandardUsedId , observationId});

})

