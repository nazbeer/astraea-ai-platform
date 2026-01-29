# Astraea AI Platform

Astraea is a FAANG-grade, production-ready AI platform with streaming LLM responses, RAG, Redis memory, and a full-stack architecture.

## Features
- Real-time token streaming
- Retrieval-Augmented Generation (FAISS)
- Redis-backed memory
- API auth + rate limiting
- Observability + health checks
- Cloud-native Docker deployment

## Stack
FastAPI • OpenAI • FAISS • Redis • Next.js • Docker

## Run Backend
docker build -t backend .
docker run -p 8000:8000 --env-file .env backend

## Run Frontend
npm install
npm run dev
