FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy application code
COPY main.py speech_graph.py fusion.py conversation.py ./

EXPOSE 6001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6001"]
