import os
from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def embed(text: str):
    return client.embeddings.create(
        model=settings.EMBED_MODEL,
        input=text
    ).data[0].embedding

def stream_chat(messages):
    return client.chat.completions.create(
        model=settings.MODEL_NAME,
        messages=messages,
        stream=True
    )
