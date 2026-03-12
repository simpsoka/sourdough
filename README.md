# Sourdough Assistant

An AI-powered web app for sourdough baking help.

## Features

- **Ask Me Anything**: Chat with an AI assistant about your sourdough starter, troubleshooting, recipes, and baking tips
- **Recipe Journal**: Save and track your bakes with ratings and notes

## Setup

1. Open `index.html` in your browser, or run a local server:
   ```bash
   cd sourdough
   python3 -m http.server 8000
   ```
   Then visit http://localhost:8000

2. (Optional) For full AI responses, add your Gemini API key to `app.js`:
   ```javascript
   const GEMINI_API_KEY = 'your-api-key-here';
   ```
   Get a key at https://makersuite.google.com/app/apikey

## Without API Key

The app works without an API key using built-in fallback responses for common questions about:
- Starter feeding schedules
- Troubleshooting (not rising, too sour)
- Basic recipes
- Hydration calculations

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- LocalStorage for recipe persistence
- Gemini API for AI chat (optional)
