# MD Sheet Editor

A lightweight, modern web application for viewing and editing Google Sheets data through n8n workflows. Built with React and designed for simplicity, this tool provides a clean interface for managing spreadsheet data without the overhead of traditional spreadsheet applications.

## 🎯 What Problems Does This Solve?

- **Lightweight Alternative**: No need for heavy spreadsheet applications like Excel or Google Sheets web interface
- **Custom Workflows**: Leverage n8n's powerful automation capabilities for data operations
- **Mobile-Friendly**: Responsive design works seamlessly on desktop and mobile devices
- **Real-time Updates**: Direct integration with Google Sheets through n8n webhooks
- **Customizable**: Easy configuration for multiple documents and sheets
- **Production Ready**: Built-in error handling, validation, and deployment options

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   React App     │◄──►│     n8n      │◄──►│  Google Sheets  │
│  (Frontend)     │    │  (Backend)   │    │   (Database)    │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

- **Frontend**: React application with Tailwind CSS for styling
- **Backend**: n8n workflows handle API calls to Google Sheets
- **Data Source**: Google Sheets as the data storage layer

## 🚀 Quick Start

### Prerequisites
- [n8n](https://n8n.io/) installed and running
- Google Sheets API access
- Node.js (for development)

### Complete Setup Guide

For a step-by-step setup process, see our **[Complete Setup Checklist](SETUP_CHECKLIST.md)**.

**Quick Overview:**

1. **[n8n Installation & Setup](n8n_templates/README-n8n-generator.md#1-n8n-installation)**
   - Install n8n
   - Configure Google Sheets credentials
   - Set up OAuth2 authentication
   - Configure environment variables

2. **[Generate n8n Templates](n8n_templates/README-n8n-generator.md#5-generate-and-import-templates)**
   - Run the template generator
   - Import workflows to n8n
   - Configure document IDs

3. **[Launch the Application](md-sheet-editor/README.md#quick-setup)**
   - Install dependencies
   - Start the development server
   - Access the application

## 📁 Project Structure

```
MD-Sheet-Editor/
├── README.md                    # This file - Main project overview
├── SETUP_CHECKLIST.md           # Complete step-by-step setup guide
├── md-sheet-editor/            # React frontend application
│   ├── README.md               # Frontend setup and usage
│   └── src/                    # React source code
└── n8n_templates/              # n8n workflow templates
    ├── README-n8n-generator.md # n8n setup and template generation
    ├── generate-n8n-templates.sh # Template generation script
    └── output/                 # Generated n8n workflows
```

### Documentation Overview

- **`README.md`** - Main project overview, architecture, and configuration guide
- **`SETUP_CHECKLIST.md`** - Complete step-by-step setup process
- **`md-sheet-editor/README.md`** - Frontend application setup and deployment
- **`n8n_templates/README-n8n-generator.md`** - n8n installation and workflow generation

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **PM2** - Process manager for production deployment

### Backend
- **n8n** - Workflow automation platform
- **Google Sheets API** - Data storage and retrieval
- **Webhooks** - Real-time communication

### Development Tools
- **Node.js** - JavaScript runtime
- **npm** - Package manager
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## 📊 Key Features

### **User Interface**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Theme**: Modern, eye-friendly interface with professional styling
- **Touch-Friendly**: Optimized for mobile interactions and touch gestures

### **Data Management**
- **Inline Editing**: Edit data directly in the table with modal dialogs
- **Real-time Updates**: Instant synchronization with Google Sheets
- **Multi-Document Support**: Switch between different Google Sheets documents
- **Multi-Sheet Support**: Navigate between sheets within documents

### **Search & Navigation**
- **Global Search**: Search across all columns in the current sheet
- **Smart Filtering**: Real-time filtering as you type
- **Pagination**: Handle large datasets efficiently with page navigation
- **Search History**: Clear search functionality with visual feedback

### **Content Display**
- **Truncated Text**: Long content is truncated with click-to-expand functionality
- **Full-Content Modal**: Click truncated cells to view complete content
- **Clickable URLs**: Automatic URL detection with clickable links
- **Data Formatting**: Clean, readable data presentation

### **System Features**
- **Environment Validation**: Automatic configuration checking on startup
- **Error Handling**: Graceful error management with user-friendly messages
- **Fallback Strategy**: Multiple endpoint support with automatic failover
- **Loading States**: Visual feedback during data operations

## 🔧 Configuration

The application uses environment variables for configuration:

### Required (at least one)
- `REACT_APP_N8N_LOCALHOST` - For local development
- `REACT_APP_N8N_CUSTOM_DOMAIN` - For production deployment

### Optional
- `REACT_APP_N8N_PORT` - n8n port (default: 5678)
- `REACT_APP_N8N_FETCH_WEBHOOK` - Fetch webhook name (default: Fetch-Rows-Multi)
- `REACT_APP_N8N_UPDATE_WEBHOOK` - Update webhook name (default: Update-Row-Multi)
- `REACT_APP_DOC_SHEET_CONFIG` - Document and sheet configuration
- `GOOGLE_SHEETS_OAUTH2_API_ID` - Google Sheets credential ID for n8n

### Configuration Examples

**Local Development Only:**
```env
REACT_APP_N8N_LOCALHOST=localhost
REACT_APP_N8N_PORT=5678
```

**Production Only:**
```env
REACT_APP_N8N_CUSTOM_DOMAIN=n8n.yourdomain.com
```

**Both Local and Production (Recommended):**
```env
REACT_APP_N8N_LOCALHOST=localhost
REACT_APP_N8N_PORT=5678
REACT_APP_N8N_CUSTOM_DOMAIN=n8n.yourdomain.com
```

### How It Works

- **URL Generation**: Automatically builds webhook URLs like `http://localhost:5678/webhook/{webhookName}`
- **Fallback Strategy**: Tries localhost first, then custom domain if configured
- **Validation**: Checks configuration on startup and shows clear error messages if invalid

## 🚀 Deployment Options

### Development
```bash
cd md-sheet-editor
npm install
npm start
```

### Testing
```bash
cd md-sheet-editor
npm test
```

You can also run specific tests:
```bash
# Run environment validation tests
node src/utils/envValidation.test.js

# Run tests in watch mode
npm test -- --watch
```

### Production
```bash
cd md-sheet-editor
npm run build
pm2 start serve --name sheet-editor -- -s build -l 3001
```

## 📚 Documentation

- **[Complete Setup Checklist](SETUP_CHECKLIST.md)** - Step-by-step setup guide
- **[n8n Setup & Templates](n8n_templates/README-n8n-generator.md)** - n8n installation and workflow generation
- **[Frontend Setup](md-sheet-editor/README.md)** - React application setup and usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Follow the [Complete Setup Checklist](SETUP_CHECKLIST.md) to ensure proper setup
2. Review the [n8n Setup Guide](n8n_templates/README-n8n-generator.md) for backend issues
3. Check the [Frontend Setup Guide](md-sheet-editor/README.md) for application issues

## 🎉 Why Choose MD Sheet Editor?

- **Lightweight**: Minimal resource usage compared to traditional spreadsheet applications
- **Customizable**: Easy to adapt for different use cases
- **Modern**: Built with current best practices and technologies
- **Scalable**: Can handle multiple documents and large datasets
- **Reliable**: Built-in error handling and validation
- **Mobile-Ready**: Responsive design works on all devices 