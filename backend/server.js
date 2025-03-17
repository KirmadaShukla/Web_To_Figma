const express = require('express');
const puppeteer = require('puppeteer');
const nlp = require('compromise');
const cors=require('cors')
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors())
app.get('/scrape-and-analyze', async (req, res) => {
  const url = req.query.url || 'https://example.com';

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-http2'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const scrapedData = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3, p, img')).map(el => ({
        type: el.tagName.toLowerCase(),
        text: el.innerText?.trim() || '',
        src: el.tagName.toLowerCase() === 'img' ? el.src : null,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      }));
    });
    await browser.close();

    // AI Analysis with NLP
    const analyzedData = scrapedData.map(item => {
      if (item.text) {
        const doc = nlp(item.text);
        const isTitle = doc.has('#Title') || item.type === 'h1' || item.type === 'h2';
        const isDescription = doc.has('#Noun #Verb') && !isTitle;
        return {
          ...item,
          category: isTitle ? 'title' : isDescription ? 'description' : 'text',
        };
      }
      return { ...item, category: item.type === 'img' ? 'image' : 'text' };
    });

    res.json(analyzedData);
  } catch (error) {
    console.error('Scraping/Analysis Error:', error);
    res.status(500).json({ error: 'Failed to scrape and analyze webpage' });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));