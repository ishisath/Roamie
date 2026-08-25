"""Thin wrapper around the Gemini API."""
import json
import re

from fastapi import HTTPException

from app.core.config import settings

MODEL = "gemini-3.6-flash"


def _client():
    if not settings.GEMINI_API_KEY:
        raise HTTPException(503, "AI is not configured. Set GEMINI_API_KEY.")
    from google import genai
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_text(prompt: str, system: str | None = None) -> str:
    from google.genai import types

    client = _client()
    config = types.GenerateContentConfig(system_instruction=system) if system else None

    try:
        response = client.models.generate_content(
            model=MODEL, contents=prompt, config=config
        )
        return response.text or ""
    except Exception as e:
        raise HTTPException(502, f"AI request failed: {e}")


def generate_json(prompt: str, system: str | None = None) -> dict:
    """Ask for JSON and parse it, tolerating markdown fences."""
    guard = ("Respond with valid JSON only. No markdown, no code fences, "
             "no commentary before or after the JSON.")
    system = f"{system}\n\n{guard}" if system else guard

    raw = generate_text(prompt, system).strip()
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        raise HTTPException(502, "AI returned malformed JSON. Please try again.")