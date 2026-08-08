const express = require("express");
const pool = require("./db");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Home Route
app.get("/", (req, res) => {
  res.send("🚍 MOBISCOPE Backend Running...");
});

// Database Test Route
app.get("/students", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error");
  }
});

// Attendance API
// Attendance API
app.post("/api/attendance", async (req, res) => {

    try {

        const { rfid_uid, bus_id } = req.body;

        // Find student using RFID
        const student = await pool.query(
            "SELECT * FROM students WHERE rfid_uid = $1",
            [rfid_uid]
        );

        if (student.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "RFID not found"
            });
        }

        const s = student.rows[0];

        // Insert attendance
        await pool.query(
            `INSERT INTO attendance (student_id, bus_id)
             VALUES ($1,$2)`,
            [s.student_id, bus_id]
        );

        res.json({
            success: true,
            student_name: s.student_name,
            parent_name: s.parent_name,
            parent_phone: s.parent_phone,
            message: "Attendance marked successfully"
        });

    } catch (err) {
        console.log(err);

        res.status(500).json({
            success:false,
            message:"Server Error"
        });
    }

});

// GPS API
app.post("/api/location", async (req, res) => {

    try {

        const { bus_id, latitude, longitude, speed } = req.body;

        await pool.query(
            `INSERT INTO bus_location
            (bus_id, latitude, longitude, speed)
            VALUES ($1,$2,$3,$4)
            ON CONFLICT (bus_id)
            DO UPDATE SET
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                speed = EXCLUDED.speed,
                updated_at = CURRENT_TIMESTAMP`,
            [bus_id, latitude, longitude, speed]
        );

        res.json({
            success: true,
            message: "Location Updated"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Database Error"
        });

    }

});

app.listen(PORT, () => {
  console.log(`Server Running on http://localhost:${PORT}`);
});