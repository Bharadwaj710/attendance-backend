import express from "express";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const PORT = process.env.PORT || 3000;

async function fetchAttendance(username, password) {
  const LOGIN_URL = "https://webprosindia.com/vignanit/Default.aspx";
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    // 1️⃣ Go to login
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    // 2️⃣ Enter credentials
    await page.type("#txtId2", username, { delay: 50 });
    await page.type("#txtPwd2", password, { delay: 50 });

    // 3️⃣ Click login
    await Promise.all([
      page.click("#imgBtn2"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {})
    ]);

    // 4️⃣ Go to attendance page
    const linkSelector = 'a.menuLink[href*="StudentAttendance"]';
    await page.waitForSelector(linkSelector, { timeout: 15000 });
    await page.click(linkSelector);

    // 5️⃣ Switch to iframe
    await page.waitForSelector("#capIframeId", { timeout: 15000 });
    const frameHandle = await page.$("#capIframeId");
    const frame = await frameHandle.contentFrame();

    // 6️⃣ Select “Till now”
    await frame.waitForSelector("#radTillNow", { timeout: 10000 });
    await frame.click("#radTillNow");

    // 7️⃣ Uncheck condonation
    const condonation = await frame.$("#chkCondonation");
    if (condonation) {
      const checked = await (await condonation.getProperty("checked")).jsonValue();
      if (checked) await condonation.click();
    }

    // 8️⃣ Click “Show”
    await frame.click("#btnShow");

    // 9️⃣ Wait for results
    await frame.waitForSelector("tr.reportData1, tr.reportData2, tr.reportData3", { timeout: 15000 });

    // 🔟 Extract attendance
    const result = await frame.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tr.reportData1, tr.reportData2, tr.reportData3"));
      const subjects = rows.map(r => {
        const cols = Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim());
        return {
          subject: cols[1],
          held: cols[2],
          attended: cols[3],
          percent: cols[4],
        };
      });

      const totalRow = Array.from(document.querySelectorAll("tr.reportHeading2WithBackground"))
        .map(r => Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim()))
        .find(cols => cols.join(" ").toLowerCase().includes("total"));

      const overallPercent = totalRow ? totalRow[totalRow.length - 1] : null;
      return { subjects, overallPercent };
    });

    await browser.close();
    return { success: true, data: result };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("❌ Error:", err.message);
    return { success: false, error: err.message };
  }
}

// 🔹 POST endpoint that accepts username & password dynamically
app.post("/fetch", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  const result = await fetchAttendance(username, password);
  res.json(result);
});

// ✅ Render health check
app.get("/", (req, res) => res.send("✅ Attendance API working"));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
