"""
Monkee - AI Image Generation App
Using Google Gemini API with Imagen 3 / Gemini Pro Image
"""

import os
import base64
import uuid
from io import BytesIO
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Monkee",
    description="AI-powered image generation using Google Gemini",
    version="1.0.0"
)

# Get API key from environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Google GenAI client
client = None
if GOOGLE_API_KEY:
    client = genai.Client(api_key=GOOGLE_API_KEY)

# Available models for image generation
MODELS = {
    "gemini-2.0-flash-preview-image-generation": {
        "name": "Gemini 2.0 Flash (Preview)",
        "max_images": 3,
        "supports_output": True
    },
    "imagen-3.0-generate-002": {
        "name": "Imagen 3",
        "max_images": 4,
        "supports_output": True
    }
}

# Default model
DEFAULT_MODEL = "gemini-2.0-flash-preview-image-generation"


def process_image(image_data: bytes, max_size: int = 1024) -> Image.Image:
    """Process and resize image if needed."""
    img = Image.open(BytesIO(image_data))

    # Convert to RGB if necessary (handles RGBA, P mode, etc.)
    if img.mode in ('RGBA', 'P', 'LA'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Resize if too large (to stay within API limits)
    if max(img.size) > max_size:
        ratio = max_size / max(img.size)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)

    return img


def image_to_base64(img: Image.Image, format: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    buffer = BytesIO()
    img.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode()


@app.get("/")
async def root():
    """Serve the main application."""
    return FileResponse("static/index.html")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "api_configured": GOOGLE_API_KEY is not None
    }


@app.post("/api/generate")
async def generate_image(
    prompt: str = Form(...),
    images: list[UploadFile] = File(default=[]),
    model: Optional[str] = Form(default=DEFAULT_MODEL),
    aspect_ratio: Optional[str] = Form(default="1:1")
):
    """
    Generate an image using Google Gemini API.

    - prompt: Text description for image generation
    - images: Optional reference images (up to 14 for Gemini 3 Pro)
    - model: Model to use for generation
    - aspect_ratio: Aspect ratio for output (1:1, 16:9, 9:16, 4:3, 3:4)
    """

    if not GOOGLE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="API key not configured. Please set GOOGLE_API_KEY environment variable."
        )

    if not client:
        raise HTTPException(
            status_code=500,
            detail="Google GenAI client not initialized."
        )

    if not prompt or not prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Prompt is required."
        )

    try:
        # Process uploaded images
        processed_images = []
        for img_file in images:
            if img_file.filename:
                img_data = await img_file.read()
                if img_data:
                    processed_img = process_image(img_data)
                    processed_images.append(processed_img)

        # Build content for the request
        contents = [prompt.strip()]

        # Add images to content if provided
        for img in processed_images:
            contents.append(img)

        # Try with Gemini model first (supports image input/output)
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash-preview-image-generation",
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                )
            )

            # Extract generated image from response
            generated_image = None
            response_text = None

            if response.candidates and response.candidates[0].content:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data is not None:
                        # Found image data
                        img_data = part.inline_data.data
                        generated_image = Image.open(BytesIO(img_data))
                    elif hasattr(part, 'text') and part.text:
                        response_text = part.text

            if generated_image:
                # Convert to base64 for response
                img_base64 = image_to_base64(generated_image)

                return JSONResponse({
                    "success": True,
                    "image": f"data:image/png;base64,{img_base64}",
                    "message": response_text or "Image generated successfully!",
                    "model_used": "gemini-2.0-flash-preview-image-generation"
                })
            else:
                # No image in response, try with Imagen 3
                raise Exception("No image generated, trying Imagen 3")

        except Exception as gemini_error:
            # Fallback to Imagen 3 for pure text-to-image
            if not processed_images:
                try:
                    response = client.models.generate_images(
                        model="imagen-3.0-generate-002",
                        prompt=prompt.strip(),
                        config=types.GenerateImagesConfig(
                            number_of_images=1,
                            aspect_ratio=aspect_ratio,
                            output_mime_type="image/png",
                        )
                    )

                    if response.generated_images:
                        img = response.generated_images[0].image
                        # The image object has a _pil_image property or we can use show()
                        # Let's get the raw bytes
                        img_pil = img._pil_image if hasattr(img, '_pil_image') else None

                        if img_pil:
                            img_base64 = image_to_base64(img_pil)
                            return JSONResponse({
                                "success": True,
                                "image": f"data:image/png;base64,{img_base64}",
                                "message": "Image generated successfully with Imagen 3!",
                                "model_used": "imagen-3.0-generate-002"
                            })
                        else:
                            # Try to get base64 directly
                            if hasattr(img, 'image_bytes'):
                                img_base64 = base64.b64encode(img.image_bytes).decode()
                                return JSONResponse({
                                    "success": True,
                                    "image": f"data:image/png;base64,{img_base64}",
                                    "message": "Image generated successfully with Imagen 3!",
                                    "model_used": "imagen-3.0-generate-002"
                                })
                except Exception as imagen_error:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Image generation failed: {str(imagen_error)}"
                    )

            raise HTTPException(
                status_code=500,
                detail=f"Image generation failed: {str(gemini_error)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )


# Mount static files AFTER API routes
app.mount("/static", StaticFiles(directory="static"), name="static")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
