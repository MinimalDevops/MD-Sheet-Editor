# Complete Setup Checklist

This checklist covers the entire setup process for the MD Sheet Editor project, from n8n installation to running the frontend application.

## ✅ Prerequisites

- [ ] Node.js (v16 or higher) installed
- [ ] Google account with Google Sheets access
- [ ] Basic knowledge of n8n workflows
- [ ] Git repository cloned

## 🔧 Backend Setup (n8n)

### 1. n8n Installation
- [ ] Install n8n globally: `npm install n8n -g`
- [ ] Or set up Docker/Docker Compose for n8n
- [ ] Start n8n: `n8n start`
- [ ] Verify n8n is running at http://localhost:5678

### 2. Google Sheets Integration
- [ ] Create Google Cloud Project
- [ ] Enable Google Sheets API
- [ ] Create OAuth2 credentials
- [ ] Configure authorized redirect URIs
- [ ] Set up Google Sheets credential in n8n
- [ ] Note the credential ID for configuration

### 3. Template Generation
- [ ] Navigate to `n8n_templates/` directory
- [ ] Copy example environment file: `cp env.example ../md-sheet-editor/.env`
- [ ] Edit `.env` file with your configuration
- [ ] Make script executable: `chmod +x generate-n8n-templates.sh`
- [ ] Run template generator: `./generate-n8n-templates.sh`
- [ ] Verify templates created in `output/` directory

### 4. Import and Configure Workflows
- [ ] Open n8n at http://localhost:5678
- [ ] Import `Fetch-Rows-Multi.json` template
- [ ] Import `Update-Rows-Multi.json` template
- [ ] Replace placeholder document IDs with actual Google Sheets IDs
- [ ] Activate both workflows
- [ ] Note the webhook URLs for each workflow

## 🎨 Frontend Setup (React App)

### 5. Environment Configuration
- [ ] Navigate to `md-sheet-editor/` directory
- [ ] Copy example environment file: `cp env.example .env`
- [ ] Edit `.env` file with your n8n configuration
- [ ] Ensure at least one domain is configured (localhost or custom domain)
- [ ] Verify document and sheet configuration matches your Google Sheets

### 6. Application Setup
- [ ] Install dependencies: `npm install`
- [ ] Verify environment validation passes
- [ ] Start development server: `npm start`
- [ ] Access application at http://localhost:3000

## 🧪 Testing

### 7. Verify Complete Workflow
- [ ] Select a document in the frontend
- [ ] Select a sheet within the document
- [ ] Verify data loads from Google Sheets
- [ ] Test editing a row
- [ ] Verify changes are saved to Google Sheets
- [ ] Test search and pagination functionality

## 🚀 Production Deployment (Optional)

### 8. Frontend Deployment
- [ ] Build production version: `npm run build`
- [ ] Deploy to your preferred hosting service
- [ ] Configure environment variables for production
- [ ] Set up domain and SSL if using custom domain

### 9. n8n Production Setup
- [ ] Configure n8n for production environment
- [ ] Set up proper authentication
- [ ] Configure custom domain if needed
- [ ] Set up monitoring and logging

## 🔍 Troubleshooting

### Common Issues and Solutions

#### n8n Issues
- **n8n won't start**: Check if port 5678 is available
- **Google Sheets authentication fails**: Verify OAuth2 credentials and redirect URIs
- **Workflows not activating**: Check credential configuration and document IDs

#### Frontend Issues
- **Environment validation errors**: Ensure at least one domain is configured
- **API calls failing**: Verify n8n is running and webhook URLs are correct
- **No data loading**: Check document/sheet configuration and Google Sheets permissions

#### Integration Issues
- **CORS errors**: Ensure n8n allows requests from your frontend domain
- **Webhook not found**: Verify workflow names match configuration
- **Data not updating**: Check Google Sheets permissions and workflow configuration

## 📞 Support

If you encounter issues:

1. **Check the logs**: Review browser console and n8n logs
2. **Verify configuration**: Ensure all environment variables are set correctly
3. **Test components individually**: Verify n8n workflows and frontend separately
4. **Review documentation**: Check the detailed guides for each component

## 📚 Documentation Links

- [Main Project Overview](../README.md)
- [n8n Setup Guide](n8n_templates/README-n8n-generator.md)
- [Frontend Setup Guide](md-sheet-editor/README.md)
- [Environment Configuration Guide](md-sheet-editor/ENVIRONMENT_SETUP.md)

---

**Note**: This checklist assumes you're setting up the project from scratch. If you're working with an existing setup, you may skip completed steps. 