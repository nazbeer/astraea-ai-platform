import os

class Settings:
    APP_NAME = "Astraea AI Platform"
    MODEL_NAME = os.getenv("MODEL_NAME")
    EMBED_MODEL = os.getenv("EMBED_MODEL")
    APP_API_KEY = os.getenv("APP_API_KEY")
    RATE_LIMIT = int(os.getenv("RATE_LIMIT", 20))

settings = Settings()
