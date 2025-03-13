require("dotenv").config();
const puppeteer = require("puppeteer");
const axios = require("axios");
const express = require("express");
const morgan = require("morgan");
const cors=require('cors')
const app = express();
app.use(cors()); 

app.use(express.json());
app.use(morgan("dev"));

const FIGMA_PERSONAL_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FIGMA_FILE_ID = process.env.FIGMA_FILE_ID;

if (!FIGMA_PERSONAL_ACCESS_TOKEN) {
    console.error("Figma Access Token is missing. Set FIGMA_ACCESS_TOKEN in your .env file.");
    process.exit(1);
}
if (!FIGMA_FILE_ID) {
    console.error("Figma File ID is missing. Set FIGMA_FILE_ID in your .env file.");
    process.exit(1);
}

async function scrapeWebsite(url) {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2" });

        const pageData = await page.evaluate(() => {
            const elements = Array.from(document.body.querySelectorAll("*"));
            return elements
                .filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0)
                .map((el) => ({
                    tag: el.tagName.toLowerCase(),
                    text: el.innerText.trim() || "",
                    styles: window.getComputedStyle(el),
                    width: el.offsetWidth,
                    height: el.offsetHeight,
                    left: el.offsetLeft,
                    top: el.offsetTop,
                }));
        });

        console.log("Scraped data successfully.");
        await browser.close();
        return pageData;
    } catch (error) {
        console.error("Scraping failed:", error.message);
        throw new Error(`Scraping failed: ${error.message}`);
    }
}

function convertToFigmaJson(pageData) {
    return pageData.map((el, index) => {
        if (!el.styles.backgroundColor || !el.styles.color) {
            console.warn(`Element ${el.tag}-${index} has undefined styles.`, el);
        }

        return {
            id: `node-${index}`,
            name: `${el.tag}-${index}`,
            type: "FRAME",
            x: el.left,
            y: el.top,
            width: el.width,
            height: el.height,
            fills: [
                {
                    type: "SOLID",
                    color: parseColor(el.styles.backgroundColor),
                },
            ],
            children: el.text
                ? [
                      {
                          id: `text-${index}`,
                          name: "Text",
                          type: "TEXT",
                          x: 0,
                          y: 0,
                          width: el.width,
                          height: el.height,
                          characters: el.text,
                          style: {
                              fontSize: parseFloat(el.styles.fontSize) || 16,
                              fontFamily: el.styles.fontFamily?.split(",")[0].replace(/['"]/g, ""),
                              textAlignHorizontal: el.styles.textAlign ? el.styles.textAlign.toUpperCase() : "LEFT",
                              fills: [
                                  {
                                      type: "SOLID",
                                      color: parseColor(el.styles.color),
                                  },
                              ],
                          },
                      },
                  ]
                : [],
        };
    });
}

function parseColor(cssColor) {
    if (!cssColor || typeof cssColor !== "string") {
        console.warn("Invalid color value:", cssColor);
        return { r: 0, g: 0, b: 0, a: 1 };
    }

    const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/);
    if (!match) return { r: 0, g: 0, b: 0, a: 1 };
    const [_, r, g, b, a] = match;
    return {
        r: parseInt(r) / 255,
        g: parseInt(g) / 255,
        b: parseInt(b) / 255,
        a: a !== undefined ? parseFloat(a) : 1,
    };
}

async function getCanvasId(fileKey) {
    try {
        const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
            headers: { "X-Figma-Token": FIGMA_PERSONAL_ACCESS_TOKEN },
        });

        const canvas = response.data.document.children.find((child) => child.type === "CANVAS");
        if (!canvas) throw new Error("No canvas found in the Figma file.");
        
        console.log("Canvas ID found:", canvas.id);
        return canvas.id;
    } catch (error) {
        throw new Error(`Failed to fetch canvas ID: ${error.message}`);
    }
}

async function uploadToFigma(fileKey, nodes) {
    try {
        const canvasId = await getCanvasId(fileKey);

        console.log(`Uploading ${nodes.length} nodes to Figma...`);
        const response = await axios.post(
            `https://api.figma.com/v1/files/${fileKey}/nodes`,
            { nodes: { [canvasId]: { children: nodes } } },
            {
                headers: {
                    "X-Figma-Token": FIGMA_PERSONAL_ACCESS_TOKEN,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Upload successful!");
        return { fileKey, data: response.data };
    } catch (error) {
        throw new Error(`Figma API Error: ${error.response?.data?.err || error.message}`);
    }
}

app.post("/convert", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "URL is required." });

        console.log(`Scraping: ${url}`);
        const pageData = await scrapeWebsite(url);

        console.log("Converting to Figma format...");
        const figmaNodes = convertToFigmaJson(pageData);

        console.log(`Uploading to Figma file: ${FIGMA_FILE_ID}...`);
        const figmaResponse = await uploadToFigma(FIGMA_FILE_ID, figmaNodes);

        res.json({
            message: "Data uploaded to Figma!",
            fileKey: figmaResponse.fileKey,
            fileUrl: `https://www.figma.com/file/${figmaResponse.fileKey}`,
            data: figmaResponse.data,
        });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
