import puppeteer from "puppeteer";

export async function fetchAttendance({ username, password }) {
  const LOGIN_URL = "https://webprosindia.com/vignanit/Default.aspx";
  const browserOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  let browser;
  try {
    browser = await puppeteer.launch(browserOptions);
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    // Go to login page
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2" });

    // Type credentials
    await page.type("#txtId2", username, { delay: 40 });
    await page.type("#txtPwd2", password, { delay: 40 });

    await Promise.all([
      page.click("#imgBtn2"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {})
    ]);

    // Click “Student Attendance”
    const linkSelector = 'a.menuLink[href*="StudentAttendance"]';
    await page.waitForSelector(linkSelector, { timeout: 10000 });
    await page.click(linkSelector);

    // Switch to iframe
    await page.waitForSelector("#capIframeId", { timeout: 15000 });
    const frameHandle = await page.$("#capIframeId");
    const frame = await frameHandle.contentFrame();

    // Select “Till now”
    await frame.waitForSelector("#radTillNow", { timeout: 8000 });
    await frame.click("#radTillNow");

    // Uncheck condonation if checked
    const condonationBox = await frame.$("#chkCondonation");
    if (condonationBox) {
      const isChecked = await (await condonationBox.getProperty("checked")).jsonValue();
      if (isChecked) await condonationBox.click();
    }

    // Click “Show”
    await frame.click("#btnShow");

    // Wait for results
    await frame.waitForSelector("tr", { timeout: 15000 });

    // Extract attendance data
    const result = await frame.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tr.reportData1, tr.reportData2, tr.reportData3"));
      const subjects = rows.map(r => {
        const cols = Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim());
        return {
          subject: cols[1],
          held: cols[2],
          attended: cols[3],
          percent: cols[4]
        };
      }).filter(r => r.subject && !r.subject.toLowerCase().includes("total"));

      const totalRow = Array.from(document.querySelectorAll("tr.reportHeading2WithBackground"))
        .map(r => Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim()))
        .find(cols => cols.join(" ").toLowerCase().includes("total"));

      const overallPercent = totalRow ? totalRow[totalRow.length - 1] : null;
      return { subjects, overallPercent };
    });

    await browser.close();

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("Scraping error:", err.message);
    return { success: false, error: err.message };
  }
}
