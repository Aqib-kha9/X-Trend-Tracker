# Twitter Trending Topics Fetcher

A Node.js application that uses **Selenium WebDriver** with **Chrome** and a **proxymesh proxy service** to scrape the top trending topics from Twitter. The application supports dynamic scrolling, proxy rotation, cookie management, and saves the fetched data to a **MongoDB** database. It also provides a REST API endpoint to fetch and process trending data on demand.

## Features

- **Dynamic Scrolling:** Automatically scrolls the page to load full content.
- **Proxy Support:** Fetches data using the ProxyMesh proxy service to ensure anonymity and access.
- **Cookie Management:** Supports importing and fixing `SameSite` cookie issues for session reuse.
- **MongoDB Integration:** Saves the fetched trending data into a MongoDB database for later use.
- **Retry Mechanism:** Implements retries for proxy IP fetch and other critical operations.
- **Debugging Tools:** Captures screenshots and logs for debugging during runtime.
- **REST API:** Exposes an API endpoint (`/run-script`) to initiate the scraping process and return the results.

---

## Technologies Used

- **Node.js**: Backend server and API handling.
- **Express.js**: REST API framework.
- **Selenium WebDriver**: For web scraping and automation.
- **Chrome WebDriver**: Headless browser used by Selenium.
- **MongoDB**: Database for storing trending data.
- **dotenv**: For environment variable management.
- **uuid**: For generating unique IDs.
- **ProxyMesh**: Proxy service for accessing Twitter.

---

## Installation

### Prerequisites
- **Node.js** and **npm** installed on your system.
- **MongoDB** installed and running.
- **ChromeDriver** installed and compatible with your Chrome browser version.
- A **ProxyMesh** account for proxy access.
- Twitter account cookies saved as `cookies.json` for session reuse.

### Clone the Repository
```bash
git clone https://github.com/yourusername/twitter-trending-fetcher.git
cd twitter-trending-fetcher
```

### Install Dependencies
```bash
npm install
```

### Environment Variables
Create a `.env` file in the project root and add the following:
```
PORT=3000
EXPLORE_URL=https://twitter.com/explore
USERNAME=your_proxymesh_username
PASSWORD=your_proxymesh_password
MONGO_URI=your_mongodb_connection_string
```

---

## Usage

### Starting the Application
Run the following command to start the server:
```bash
node app.js
```
The server will run at `http://localhost:3000`.

### API Endpoint

#### GET `/run-script`
Initiates the Selenium script to fetch the top 5 trending topics and saves the results to MongoDB.

#### Example Response
```json
{
  "id": "unique-id",
  "trends": [
    {
      "category": "Politics",
      "trendName": "#Election2024",
      "postsCount": "50.5K Tweets"
    },
    {
      "category": "Sports",
      "trendName": "#FIFAWorldCup",
      "postsCount": "120K Tweets"
    }
  ],
  "ip": "192.168.1.1"
}
```

---

## File Structure

```
.
├── config/
│   └── db.js                 # MongoDB connection setup
├── models/
│   └── trendingData.js       # Mongoose schema for trending data
├── public/
│   └── debug-*.png           # Debug screenshots
├── .env                      # Environment variables
├── cookies.json              # Saved Twitter session cookies
├── app.js                    # Main application logic
├── package.json              # Project dependencies
└── README.md                 # Project documentation
```

---

## Debugging

- Screenshots of critical steps are saved in the `/public` folder for analysis.
- Logs provide details about the current IP, scrolling status, and Selenium driver operations.
- Ensure that the `cookies.json` file is up-to-date to avoid login issues.

---

## Contributing

1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

---

## Troubleshooting

### Common Issues
1. **Cookies Not Found**: Ensure `cookies.json` exists in the project root and contains valid session cookies.
2. **Proxy Errors**: Verify your ProxyMesh credentials and check the proxy server status.
3. **Scrolling Fails**: Adjust the `delay` in the `scrollToEnd` function to match your network speed.
4. **Selenium Driver Issues**: Ensure that ChromeDriver is installed and matches your Chrome browser version.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Author

**Your Name**  
GitHub: [@AQIB](https://github.com/Aqib-kha9)

