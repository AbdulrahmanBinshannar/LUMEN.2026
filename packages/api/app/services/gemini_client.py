"""
Google Gemini AI client — replaces Anthropic/Claude.
Uses the free Google AI Studio API (gemini-2.0-flash).

Get your free key at: https://aistudio.google.com/apikey
"""
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from ..deps import get_settings
from typing import AsyncIterator
import asyncio

_configured = False
MODEL = "gemini-2.0-flash"


def _configure():
    global _configured
    if not _configured:
        genai.configure(api_key=get_settings().gemini_api_key)
        _configured = True


def _get_model(system: str) -> genai.GenerativeModel:
    _configure()
    return genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=system,
        generation_config=GenerationConfig(
            temperature=0.7,
            max_output_tokens=1024,
        ),
    )


def _convert_messages(messages: list[dict]) -> list[dict]:
    """Convert OpenAI-style messages to Gemini format."""
    converted = []
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        converted.append({"role": role, "parts": [m["content"]]})
    return converted


async def stream_chat(
    system: str,
    messages: list[dict],
    model: str = MODEL,
    max_tokens: int = 1024,
) -> AsyncIterator[str]:
    """Stream a chat response token by token."""
    _configure()
    mdl = _get_model(system)

    history = _convert_messages(messages[:-1]) if len(messages) > 1 else []
    last_msg = messages[-1]["content"] if messages else ""

    chat = mdl.start_chat(history=history)

    # Gemini's streaming is synchronous — run in thread pool
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: chat.send_message(last_msg, stream=True),
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text
            await asyncio.sleep(0)  # yield control to event loop


async def complete(
    system: str,
    messages: list[dict],
    model: str = MODEL,
    max_tokens: int = 2048,
) -> str:
    """Single-shot completion — returns full text."""
    _configure()
    mdl = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=system,
        generation_config=GenerationConfig(
            temperature=0.3,
            max_output_tokens=max_tokens,
        ),
    )

    history = _convert_messages(messages[:-1]) if len(messages) > 1 else []
    last_msg = messages[-1]["content"] if messages else ""

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: mdl.start_chat(history=history).send_message(last_msg),
    )

    return response.text if response.text else ""
