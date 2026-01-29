import os
from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def embed(text: str):
    return client.embeddings.create(
        model=settings.EMBED_MODEL,
        input=text
    ).data[0].embedding

def stream_chat(messages, tools=None, model=None):
    params = {
        "model": model or settings.MODEL_NAME,
        "messages": messages,
        "stream": True
    }
    if tools:
        params["tools"] = tools
        params["tool_choice"] = "auto"

    return client.chat.completions.create(**params)

def chat_completion(messages, tools=None, model=None):
    params = {
        "model": model or settings.MODEL_NAME,
        "messages": messages,
        "stream": False
    }
    if tools:
        params["tools"] = tools
        params["tool_choice"] = "auto"

    return client.chat.completions.create(**params)
