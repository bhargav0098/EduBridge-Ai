#!/bin/bash
# EduBridge AI — Development startup script
set -e

echo "🎓 EduBridge AI — Starting Development Environment"

# Check if .env files exist
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "📋 Created .env from .env.example — please fill in your API keys"
fi

if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "📋 Created backend/.env from backend/.env.example"
fi

# Function to start backend
start_backend() {
  echo "🐍 Starting Python backend..."
  cd backend
  
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "✅ Created Python virtual environment"
  fi
  
  source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null
  pip install -q -r requirements.txt
  
  cd ..
  python -m uvicorn backend.main:app --reload --port 8000 &
  BACKEND_PID=$!
  echo "✅ Backend running on http://localhost:8000 (PID: $BACKEND_PID)"
}

# Function to start frontend
start_frontend() {
  echo "⚛️  Starting Next.js frontend..."
  
  if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps
    echo "✅ Installed Node.js dependencies"
  fi
  
  npm run dev &
  FRONTEND_PID=$!
  echo "✅ Frontend running on http://localhost:3000 (PID: $FRONTEND_PID)"
}

# Trap SIGINT to kill both processes
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

start_backend
sleep 2
start_frontend

echo ""
echo "🚀 EduBridge AI is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

wait
