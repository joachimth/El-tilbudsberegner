export async function htmlToPdf(html: string): Promise<Buffer> {
  let chromium: any;
  try {
    const playwright = await import("playwright");
    chromium = playwright.chromium;
  } catch {
    throw new Error("PDF-eksport kræver playwright, som ikke er installeret på denne server.");
  }

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
