const express = require("express");
const pool = require("./db");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
    res.send("🚍 MOBISCOPE Backend Running...");
});


// ======================================================
// GET ALL STUDENTS
// ======================================================

app.get("/students", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM students ORDER BY student_id"
        );

        res.json(result.rows);

    } catch (err) {
        console.error("Students API Error:", err);

        res.status(500).json({
            success: false,
            message: "Database Error"
        });
    }
});


// ======================================================
// ATTENDANCE API
// POST /api/attendance
// ======================================================

app.post("/api/attendance", async (req, res) => {

    try {

        const { rfid_uid, bus_id } = req.body;

        // Validate request
        if (!rfid_uid || !bus_id) {
            return res.status(400).json({
                success: false,
                message: "rfid_uid and bus_id are required"
            });
        }

        // Find student using RFID
        const student = await pool.query(
            `SELECT
                student_id,
                student_name,
                parent_name,
                parent_phone,
                url,
                rfid_uid
             FROM students
             WHERE rfid_uid = $1`,
            [rfid_uid]
        );

        // RFID not found
        if (student.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "RFID not found"
            });
        }

        const s = student.rows[0];

        // Insert attendance
        // boarding_time automatically uses IST
        // because of the database DEFAULT
        await pool.query(
            `INSERT INTO attendance
                (student_id, bus_id)
             VALUES
                ($1, $2)`,
            [s.student_id, bus_id]
        );

        // Send response
        res.status(200).json({
            success: true,

            student_id: s.student_id,
            student_name: s.student_name,

            parent_name: s.parent_name,
            parent_phone: s.parent_phone,

            url: s.url,

            rfid_uid: s.rfid_uid,
            bus_id: bus_id,

            message: "Attendance marked successfully"
        });

    } catch (err) {

        console.error("Attendance API Error:", err);

        res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message
        });
    }
});


// ======================================================
// GPS LOCATION API
// POST /api/location
// ======================================================

app.post("/api/location", async (req, res) => {

    try {

        const {
            bus_id,
            latitude,
            longitude,
            speed
        } = req.body;

        // Validate request
        if (
            !bus_id ||
            latitude === undefined ||
            longitude === undefined ||
            speed === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "bus_id, latitude, longitude and speed are required"
            });
        }

        // Insert new bus OR update existing bus
        await pool.query(
            `INSERT INTO bus_location
                (bus_id, latitude, longitude, speed)
             VALUES
                ($1, $2, $3, $4)

             ON CONFLICT (bus_id)
             DO UPDATE SET
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                speed = EXCLUDED.speed,
                updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'`,
            [
                bus_id,
                latitude,
                longitude,
                speed
            ]
        );

        res.status(200).json({
            success: true,
            message: "Location Updated"
        });

    } catch (err) {

        console.error("Location API Error:", err);

        res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message
        });
    }
});


// ======================================================
// GET CURRENT BUS LOCATION
// GET /api/location/:bus_id
// ======================================================

app.get("/api/location/:bus_id", async (req, res) => {

    try {

        const { bus_id } = req.params;

        const result = await pool.query(
            `SELECT
                location_id,
                bus_id,
                latitude,
                longitude,
                speed,
                timestamp,
                updated_at
             FROM bus_location
             WHERE bus_id = $1`,
            [bus_id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Bus location not found"
            });

        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {

        console.error("Get Location Error:", err);

        res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message
        });
    }
});


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

    console.log(
        `Server Running on http://localhost:${PORT}`
    );

});