#!/bin/bash

# Sonicity Game Setup Script

echo "Setting up Sonicity - 3D City Building Game..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    echo "Visit https://nodejs.org/ to download and install Node.js."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if the installation was successful
if [ $? -eq 0 ]; then
    echo "Dependencies installed successfully!"
    echo ""
    echo "To start the game, run:"
    echo "  npm start"
    echo ""
    echo "Then open your browser and navigate to:"
    echo "  http://localhost:8080"
    echo ""
    echo "Enjoy playing Sonicity!"
else
    echo "Failed to install dependencies. Please check the error messages above."
    exit 1
fi 