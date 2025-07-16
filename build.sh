#!/bin/bash

echo "🚀 Starting AudioRoad Network build process..."

# Build the React client
echo "📦 Building React client..."
cd client
npm install
npm run build
cd ..

echo "✅ Build complete! The application is ready for deployment."
echo "📝 To run in production:"
echo "   1. Set NODE_ENV=production"
echo "   2. Ensure all environment variables are set"
echo "   3. Run: npm start"