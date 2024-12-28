import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import connectDB from "./config/db.js";
import Trending from "./models/trendingData.js";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const EXPLORE_URL = process.env.EXPLORE_URL;
const app = express();
app.use(cors());
app.use(express.static(path.join(process.cwd(), "public")));
connectDB();

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const proxyServer = `http://${USERNAME}:${PASSWORD}@open.proxymesh.com:31280`;

// Utility function for delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Debug helper function to capture screenshots and logs
const debugPageState = async (driver, step) => {
  try {
    const screenshotPath = path.join(process.cwd(), `public/debug-${step}.png`);
    const image = await driver.takeScreenshot();
    fs.writeFileSync(screenshotPath, image, "base64");

    console.log(`[DEBUG] Step: ${step}`);
    console.log(`[DEBUG] Screenshot saved at: ${screenshotPath}`);

    const url = await driver.getCurrentUrl();
    console.log(`[DEBUG] Current URL: ${url}`);

    const pageContent = await driver.executeScript(() =>
      document.body.innerText.slice(0, 500)
    );
    console.log(`[DEBUG] Page Content Preview:\n${pageContent}`);
  } catch (error) {
    console.error(
      `[DEBUG ERROR] Debugging step "${step}" failed:`,
      error.message
    );
    throw error;
  }
};

// Utility function to fix SameSite cookie issues
const fixSameSiteCookies = (cookies) =>
  cookies.map((cookie) => {
    if (cookie.hasOwnProperty("sameSite")) {
      const value = cookie.sameSite.toLowerCase();
      if (["unspecified", "no_restriction"].includes(value))
        cookie.sameSite = "Lax";
      else cookie.sameSite = value.charAt(0).toUpperCase() + value.slice(1);

      if (cookie.sameSite === "None") cookie.secure = true;
    }
    return cookie;
  });

// Retry-enabled function to fetch current IP address via proxy
const fetchIP = (retries = 3) => {
  const command = `curl -x ${proxyServer} --insecure https://api.ipify.org`;

  return new Promise((resolve, reject) => {
    const attempt = (retryCount) => {
      exec(command, (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout.trim());
        } else if (retryCount > 0) {
          console.log(
            `[DEBUG] Retry fetch IP (${retries - retryCount + 1}/${retries})`
          );
          attempt(retryCount - 1);
        } else {
          reject(
            new Error(
              `[ERROR] Failed after ${retries} retries: ${
                stderr || error.message
              }`
            )
          );
        }
      });
    };

    attempt(retries);
  });
};

// Scroll the page dynamically to load all content
const scrollToEnd = async (driver) => {
  try {
    let lastHeight = await driver.executeScript("return document.body.scrollHeight");
    while (true) {
      await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");
      await delay(2000); // Adjust delay based on page load speed
      const newHeight = await driver.executeScript("return document.body.scrollHeight");
      if (newHeight === lastHeight) break;
      lastHeight = newHeight;
    }
    console.log("[INFO] Scrolling completed. Full content loaded.");
  } catch (error) {
    console.error("[ERROR] Failed during scrolling:", error.message);
    throw error;
  }
};

// Fetch trending topics using Selenium with proxy rotation
const fetchTrendingTopics = async () => {
  const startTime = Date.now();
  console.log(`[DEBUG] Using Proxy: ${proxyServer}`);

  const options = new chrome.Options().addArguments(
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-ssl-errors",
    "--enable-logging",
    "--v=2"
  );

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.manage().deleteAllCookies(); // Clear cookies before starting
    const ipAddress = await fetchIP(3); // Fetch IP with retries
    console.log(`[INFO] Current IP Address: ${ipAddress}`);

    const cookiesPath = path.resolve("cookies.json");
    if (fs.existsSync(cookiesPath)) {
      let cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"));
      cookies = fixSameSiteCookies(cookies);

      await driver.get(EXPLORE_URL);
      await debugPageState(driver, "before-setting-cookies");

      for (const cookie of cookies) {
        await driver.manage().addCookie(cookie);
      }

      await driver.navigate().refresh();
      await delay(5000);
      await debugPageState(driver, "after-refresh");

      // Scroll to load all content
      await scrollToEnd(driver);

      // Extract full trending data dynamically
      const trends = await driver.executeScript(() => {
        const trendContainer = document.querySelector('[aria-label="Timeline: Trending now"]');
        if (!trendContainer) return [];
        const trendItems = trendContainer.querySelectorAll("div.css-175oi2r.r-1adg3ll.r-1ny4l3l");

        return Array.from(trendItems)
          .map((el) => {
            const categoryElement = el.querySelector("span.css-1jxf684");
            const trendNameElement = el.querySelectorAll("span.css-1jxf684")[1];
            const postsCountElement = el.querySelectorAll("span.css-1jxf684")[2];

            if (!categoryElement || !trendNameElement || !postsCountElement) {
              return null;
            }
            const category = categoryElement.textContent.trim();
            const trendName = trendNameElement.textContent.trim();
            const postsCount = postsCountElement.textContent.trim();
            return { category, trendName, postsCount };
          })
          .filter((trend) => trend !== null);
      });

      const top5Trends = trends.slice(0, 5); // Get top 5 trends
      console.log("[DEBUG] Parsed top 5 trends:", top5Trends);

      return { id: uuidv4(), trends: top5Trends, ip: ipAddress };
    } else {
      throw new Error("Cookies file not found.");
    }
  } catch (error) {
    console.error("[ERROR] Failed to fetch trending topics:", error.message);
    throw error;
  } finally {
    console.log("[DEBUG] Quitting driver...");
    await driver.quit();
    console.log("[DEBUG] Driver quit successfully.");
  }
};

// Save data to MongoDB
const saveToDatabase = async (data) => {
  try {
    console.log("Saving data:", data);
    const trendingData = new Trending(data);
    await trendingData.save();
    console.log("[INFO] Data saved to MongoDB.");
  } catch (error) {
    console.error("[ERROR] Failed to save data:", error.message);
    throw error;
  }
};

// API endpoint to fetch and return trending topics
app.get("/run-script", async (req, res) => {
  try {
    const data = await fetchTrendingTopics();
    await saveToDatabase(data);
    res.json(data); // Send successful response
  } catch (error) {
    console.error("[ERROR] Error in /run-script:", error.message);
    res.status(500).json({
      message: "[ERROR] Error in /run-script:",
      error: error.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
