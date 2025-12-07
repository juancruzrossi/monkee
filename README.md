# 🐵 Monkee

AI-powered image generation using Google Gemini API.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Text-to-Image Generation** — Generate images from text prompts using Gemini AI
- **Image-to-Image** — Upload reference images to guide the generation
- **Multiple Aspect Ratios** — Square, landscape, portrait, and standard formats
- **Responsive Design** — Works seamlessly on desktop and mobile
- **Elegant Dark Mode** — Soft, minimal design with stellar mist aesthetics

## Quick Start

### Prerequisites

- Python 3.11+
- Google Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/juancruzrossi/monkee.git
cd monkee

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
```

### Run Locally

```bash
python main.py
```

Visit `http://localhost:8000` in your browser.

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

1. Click "Deploy on Railway" or create a new project
2. Connect your GitHub repository
3. Add environment variable: `GOOGLE_API_KEY`
4. Deploy

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Your Google Gemini API key | Yes |
| `PORT` | Server port (default: 8000) | No |

## Tech Stack

- **Backend**: FastAPI, Python
- **Frontend**: Vanilla JavaScript, CSS3
- **AI**: Google Gemini API (gemini-2.0-flash-preview-image-generation)
- **Deployment**: Railway

## API Reference

### Generate Image

```
POST /api/generate
Content-Type: multipart/form-data

Parameters:
- prompt (required): Text description
- images (optional): Reference images (up to 14)
- aspect_ratio (optional): 1:1, 16:9, 9:16, 4:3, 3:4
```

### Health Check

```
GET /api/health
```

## License

MIT License — feel free to use this project for your own purposes.

---

Built with 🐵 by [Juan Cruz Rossi](https://github.com/juancruzrossi)
