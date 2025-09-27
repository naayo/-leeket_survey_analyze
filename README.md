# Leeket Survey Dashboard

A secure, modern dashboard for analyzing survey results with authentication protection.

## Features

- **Google Sheets Integration** 🆕
  - Live data synchronization from Google Sheets
  - Automatic data refresh every 5 minutes
  - Fallback to local data when offline
  - Real-time survey results updates

- **Secure Authentication System**
  - Token-based authentication
  - Session management (1 hour normal, 7 days with "remember me")
  - Password visibility toggle
  - Automatic logout on token expiration

- **Interactive Dashboard**
  - Real-time data visualization with Chart.js
  - Responsive design for all devices
  - Beautiful animations and transitions
  - Comprehensive survey analytics with live updates

## Authorized Users

- Username: `amy` | Password: `leeketdeamy`
- Username: `coumba` | Password: `leeketdecoumba`
- Username: `amyb` | Password: `leeketdemayb`
- Username: `baila` | Password: `leeketdebaila`

## Deployment on Netlify

1. **Create a new site on Netlify**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Deploy manually"
   - Drag and drop your project folder

2. **Or deploy via Git**
   - Connect your GitHub/GitLab/Bitbucket repository
   - Netlify will auto-deploy on every push

3. **Site Configuration**
   - The `netlify.toml` and `_redirects` files are already configured
   - No additional build settings needed
   - Your site will be live at `https://your-site-name.netlify.app`

## Google Sheets Setup

**Quick Setup:**
1. Make your Google Sheet public (Share → Anyone with link can view)
2. Copy the Sheet ID from the URL
3. Open `sheets-config.js` and replace `YOUR_SHEET_ID_HERE` with your Sheet ID

See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for detailed instructions.

## Local Development

To run locally:
1. Configure Google Sheets connection (see above)
2. Open `index.html` in a web browser
3. Login with one of the authorized credentials
4. You'll be redirected to the dashboard with live data

## Project Structure

```
leeket_survey_analyze/
├── index.html              # Login page (entry point)
├── dashboard.html          # Protected dashboard with charts
├── auth.js                # Authentication logic
├── sheets-config.js       # Google Sheets configuration
├── data-fetcher.js        # Data fetching and processing
├── dashboard-updated.js   # Dashboard initialization
├── netlify.toml          # Netlify configuration
├── _redirects            # URL redirect rules
├── GOOGLE_SHEETS_SETUP.md # Google Sheets setup guide
└── README.md             # Documentation
```

## Security Features

- Client-side authentication with token validation
- Session expiration (1 hour default, 7 days with remember me)
- Automatic redirect to login on unauthorized access
- Password masking with visibility toggle
- Secure token generation and storage

## Technologies Used

- HTML5/CSS3
- Vanilla JavaScript
- Chart.js for data visualization
- Responsive design with CSS Grid and Flexbox

## Support

For any issues or questions, please contact the development team.