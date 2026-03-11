FROM python:3.9-slim

WORKDIR /app

# Install openssl for certificate generation
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the machine learning pipeline and model
COPY . .

# Generate a self-signed certificate (valid for 365 days)
# In production, mount real certificates via docker-compose volumes instead
RUN mkdir -p /app/certs && \
    openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout /app/certs/key.pem -out /app/certs/cert.pem \
    -days 365 -subj "/CN=localhost"

# Expose the HTTPS port
EXPOSE 8000

# Command to run the application with SSL
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000", "--ssl-keyfile", "/app/certs/key.pem", "--ssl-certfile", "/app/certs/cert.pem"]
