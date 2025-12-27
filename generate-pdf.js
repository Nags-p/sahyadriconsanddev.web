const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const port = 3000;

// This allows the server to serve files from your project directory (like images and CSS)
app.use(express.static(path.join(__dirname)));

// The main endpoint to generate the PDF
app.get('/generate-pdf', async (req, res) => {
    console.log('PDF generation started...');
    let browser;
    try {
        // Launch a headless browser instance
        browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        // Navigate to your local brochure HTML file
        // We use the server's own URL to make sure all assets (images, CSS) load correctly.
        const fileUrl = `http://localhost:${port}/brochure-generator.html`;
        await page.goto(fileUrl, {
            waitUntil: 'networkidle0' // Waits until the network is quiet (all images/data loaded)
        });

        // Generate the PDF from the page content
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // Crucial for including background colors/images
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        // Set headers to trigger a download in the browser
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Sahyadri_Constructions_Brochure.pdf');
        res.send(pdfBuffer);
        
        console.log('PDF generation successful!');

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Could not generate PDF. Check server console for errors.');
    } finally {
        // Ensure the browser is closed even if an error occurs
        if (browser) {
            await browser.close();
        }
    }
});

// Start the server
app.listen(port, () => {
    console.log(`\n✅ PDF Generation Server is running!`);
    console.log(`   To generate your brochure, open this URL in your browser:`);
    console.log(`   ➡️  http://localhost:${port}/generate-pdf\n`);
});