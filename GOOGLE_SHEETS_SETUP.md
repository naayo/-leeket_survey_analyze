# Google Sheets Integration Setup Guide

## Quick Setup (3 Steps)

### Step 1: Make Your Google Sheet Public
1. Open your Google Sheet (`leeket-survey.xlsx`)
2. Click **Share** button (top right)
3. Change to **"Anyone with the link can view"**
4. Click **Copy link**

### Step 2: Get Your Sheet ID
From your Google Sheets URL:
```
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit#gid=0
                                       ^^^^^^^^^^^^^^
```
Copy the part between `/d/` and `/edit`

### Step 3: Configure the Dashboard
1. Open `sheets-config.js`
2. Replace `YOUR_SHEET_ID_HERE` with your actual Sheet ID:

```javascript
const SHEETS_CONFIG = {
    // Replace with your actual Google Sheets ID
    SHEET_ID: 'your-actual-sheet-id-here',  // <- PASTE YOUR ID HERE
    ...
}
```

## Expected Sheet Structure

Your Google Sheet should have these columns (order matters):

| Column | Expected Content |
|--------|-----------------|
| A | Timestamp |
| B | Email |
| C | Name/Nom |
| D | Age/Âge |
| E | Location/Localisation |
| F | Phone/Téléphone |
| G | Interest Level/Niveau d'intérêt (1-5) |
| H | Services souhaités |
| I | Dishes/Plats préférés |
| J | Prix minimum |
| K | Prix idéal |
| L | Prix maximum |
| M | Prix livraison |
| N | Beta Tester (Oui/Non) |
| O | Fréquence de commande |
| P | Horaire de commande |
| Q | Comments/Commentaires |

## Alternative Setup Options

### Option A: Using Google API Key (Higher Rate Limits)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create credentials (API Key)
5. Add the API key to `sheets-config.js`:

```javascript
API_KEY: 'your-google-api-key-here',
```

### Option B: Using CORS Proxy (Development Only)
If you encounter CORS issues during development:

1. The dashboard will automatically try to use a CORS proxy
2. For production, deploy to Netlify which handles CORS properly

## Testing Your Connection

1. Open the dashboard
2. Check the indicator at bottom left:
   - 🟢 **Green**: Live Google Sheets connection
   - 🟠 **Orange**: Using fallback data (check configuration)

## Troubleshooting

### "Using fallback data" message
- Verify Sheet ID is correct
- Ensure sheet is public (anyone with link can view)
- Check browser console for specific errors

### CORS errors
- This is normal in local development
- Deploy to Netlify for production use
- Or use a local proxy server for development

### Data not updating
- Google Sheets data is cached for 5 minutes
- Click "🔄 Réessayer" to force refresh
- Clear browser cache if needed

## Data Processing

The dashboard automatically:
- Calculates statistics from raw survey data
- Segments prospects (hot/warm/cold)
- Analyzes age distribution
- Identifies top dishes
- Calculates average prices
- Counts beta testers
- And more...

## Security Notes

- Sheet must be read-only (view access only)
- Never share edit access publicly
- API keys should have restricted scope
- Authentication is handled separately (not related to Sheets)

## Support

For issues with:
- **Google Sheets setup**: Check Google's documentation
- **Dashboard bugs**: Contact development team
- **Data not showing**: Verify sheet structure matches expected format