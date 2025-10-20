const puppeteer = require("puppeteer");

async function fetchAttendance({ username, password, headless = true, executablePath }) {
  const LOGIN_URL = "https://webprosindia.com/vignanit/Default.aspx";
  const browserOptions = {
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };
  if (executablePath) browserOptions.executablePath = executablePath;

  let browser;
  try {
    browser = await puppeteer.launch(browserOptions);
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    // 1️⃣ Go to login page
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    // 2️⃣ Login
    await page.type("#txtId2", username, { delay: 40 });
    await page.type("#txtPwd2", password, { delay: 40 });
    await Promise.all([
      page.click("#imgBtn2"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {})
    ]);

    // 3️⃣ Click Attendance link
    const linkSelector = 'a.menuLink[href*="StudentAttendance"]';
    await page.waitForSelector(linkSelector, { timeout: 10000 });
    await page.click(linkSelector);

    // 4️⃣ Switch to iframe
    await page.waitForSelector("#capIframeId", { timeout: 15000 });
    const frameHandle = await page.$("#capIframeId");
    const frame = await frameHandle.contentFrame();

    // 5️⃣ Select “Till now” and uncheck condonation
    await frame.waitForSelector("#radTillNow", { timeout: 8000 });
    await frame.click("#radTillNow");

    const condonationBox = await frame.$("#chkCondonation");
    if (condonationBox) {
      const isChecked = await (await condonationBox.getProperty("checked")).jsonValue();
      if (isChecked) await condonationBox.click();
    }

    // 6️⃣ Click “Show”
    await frame.click("#btnShow");

    // 7️⃣ Wait for table
    await frame.waitForSelector("table", { timeout: 15000 });

    // 8️⃣ Extract attendance data
    const result = await frame.evaluate(() => {
      const allRows = Array.from(document.querySelectorAll("tr"));
      let totalRow = null;

      // find TOTAL row
      for (const r of allRows) {
        const firstCell = r.querySelector("td, th");
        if (firstCell && firstCell.innerText.trim().toLowerCase() === "total") {
          totalRow = r;
          break;
        }
      }

      if (!totalRow) return { overallPercent: null, subjects: [] };

      // extract total percentage
      const totalCells = Array.from(totalRow.querySelectorAll("td, th")).map(td =>
        td.innerText.trim()
      );
      const overallPercent = totalCells[totalCells.length - 1] || null;

      // extract subjects (ignore RollNo, headers, totals)
      const rows = Array.from(document.querySelectorAll("tr"))
        .map(r => {
          const cols = Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim());
          return cols.length >= 4
            ? { subject: cols[1], held: cols[2], attended: cols[3], percent: cols[4] }
            : null;
        })
        .filter(
          row =>
            row &&
            row.subject &&
            !/^(rollno|subject)$/i.test(row.subject) &&
            !/total/i.test(row.subject)
        );

      return { overallPercent, subjects: rows };
    });

    await browser.close();

    if (!result.overallPercent) {
      return { success: false, error: "Total attendance not found" };
    }

    return {
      success: true,
      result,
      timestamp: Date.now()
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return { success: false, error: err.message };
  }
}

module.exports = { fetchAttendance };
