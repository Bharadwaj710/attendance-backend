import express from "express";
import cors from "cors";
import { fetchAttendance } from "./scraper.js";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("✅ Attendance Scraper API is running");
});

// 🔹 POST endpoint that accepts credentials
app.post("/fetch", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  const result = await fetchAttendance({ username, password });
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));
