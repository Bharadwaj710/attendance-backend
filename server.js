import express from "express";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Helper to wait for selectors safely
async function waitAndType(page, selector, text) {
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  await page.type(selector, text, { delay: 80 });
}

// 🧠 Core scraper: auto login → fetch attendance → extract overall %

async function fetchAttendance() {
  const LOGIN_URL = "https://webprosindia.com/vignanit/Default.aspx";

  const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
  ],
});

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    // 1️⃣ Go to login
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    // 2️⃣ Enter credentials
    await page.waitForSelector("#txtId2", { timeout: 15000 });
    await page.type("#txtId2", process.env.STUDENT_USERNAME, { delay: 50 });
    await page.type("#txtPwd2", process.env.STUDENT_PASSWORD, { delay: 50 });

    // 3️⃣ Click login
    await Promise.all([
      page.click("#imgBtn2"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {}),
    ]);

    // 4️⃣ Click "Student Attendance" link
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

    // 7️⃣ Uncheck condonation checkbox if needed
    const condonation = await frame.$("#chkCondonation");
    if (condonation) {
      const checked = await (await condonation.getProperty("checked")).jsonValue();
      if (checked) await condonation.click();
    }

    // 8️⃣ Click Show
    await frame.click("#btnShow");

    // 9️⃣ Wait for the result table
    await frame.waitForSelector("tr.reportData1, tr.reportData2, tr.reportData3", { timeout: 15000 });

    // 🔟 Extract attendance data
    // 🔟 Extract attendance data
const result = await frame.evaluate(() => {
  const rows = Array.from(document.querySelectorAll("tr.reportData1, tr.reportData2, tr.reportData3"));
  const subjects = [];

  for (const r of rows) {
    const cols = Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim());
    // expect [Sl.No, Subject, Held, Attend, %]
    if (cols.length >= 5) {
      subjects.push({
        subject: cols[1],
        held: cols[2],
        attended: cols[3],
        percent: cols[4],
      });
    }
  }

  const totalRow = Array.from(document.querySelectorAll("tr.reportHeading2WithBackground"))
    .map(r => Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim()))
    .find(cols => cols.join(" ").toLowerCase().includes("total"));

  const overallPercent = totalRow ? totalRow[totalRow.length - 1] : null;

  return { subjects, overallPercent };
});
    await browser.close();

    // 🧹 Clean unwanted junk rows
    const cleaned = result.subjects.filter(
      s =>
        s.subject &&
        !s.subject.toLowerCase().includes("roll") &&
        !s.subject.toLowerCase().includes("report") &&
        !s.subject.toLowerCase().includes("sl.") &&
        !s.subject.toLowerCase().includes("subject")
    );

    return { ok: true, data: { overallPercent: result.overallPercent, subjects: cleaned } };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("❌ Scraping error:", err.message);
    return { ok: false, error: err.message };
  }
}
// 🧩 API route
app.get("/fetch", async (req, res) => {
  const result = await fetchAttendance();
  res.json(result);
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
