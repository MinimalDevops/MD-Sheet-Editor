# n8n Setup & Template Generator

This guide covers n8n installation, Google Sheets integration, and template generation for the MD Sheet Editor project.

## Prerequisites

- Node.js (v16 or higher)
- Google account with Google Sheets access
- Basic knowledge of n8n workflows

## 1. n8n Installation

For detailed installation instructions, visit the [official n8n installation guide](https://github.com/n8n-io/n8n).

### Quick Start Options

**Using npx (easiest):**
```bash
npx n8n
```

**Using npm:**
```bash
npm install n8n -g
n8n start
```

**Using Docker:**
```bash
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Access n8n at: http://localhost:5678

## 2. Google Sheets Setup

### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Create OAuth2 credentials

### Configure OAuth2 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Set application type to "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:5678/callback`
   - `https://your-n8n-domain.com/callback` (if using custom domain)
5. Note down the Client ID and Client Secret

### Set up Google Sheets Credential in n8n
1. In n8n, go to "Settings" > "Credentials"
2. Click "Add Credential"
3. Select "Google Sheets OAuth2 API"
4. Enter your Client ID and Client Secret
5. Complete the OAuth flow
6. Note the credential ID for use in configuration

## 3. Template Generation

This script generates n8n templates for Google Sheets operations based on your configuration. It creates two templates:

1. **Fetch-Rows-Multi.json** - For retrieving data from Google Sheets
2. **Update-Rows-Multi.json** - For updating/adding data to Google Sheets

### Features

- **Dynamic Document Switching**: Automatically creates switches based on your document configuration
- **Multi-Sheet Support**: Handles multiple sheets per document
- **Configurable via .env**: Easy configuration through environment variables
- **Ready to Import**: Generated templates can be directly imported into n8n

## 4. Configuration Setup

### Create Configuration File

Copy the comprehensive example configuration file to the md-sheet-editor directory:

```bash
cp md-sheet-editor/env.example md-sheet-editor/.env
```

### Configure Your Settings

Edit the `.env` file with your settings. The file contains all necessary environment variables for both n8n template generation and the frontend application:

```bash
# Google Sheets OAuth2 API Credential ID from n8n
GOOGLE_SHEETS_OAUTH2_API_ID=your_credential_id_here

# Document and Sheet Configuration
# Format: "doc1:sheet1[matchCol1],sheet2[matchCol2];doc2:sheet3[matchCol3]"
REACT_APP_DOC_SHEET_CONFIG="Links:Meeting[Meeting Name],mixed[Link];Projects:Tasks[Task Name],Notes[Title]"

# N8N Domain Configuration (at least one required)
REACT_APP_N8N_LOCALHOST=localhost
REACT_APP_N8N_PORT=5678
# REACT_APP_N8N_CUSTOM_DOMAIN=your-n8n-domain.com

# Webhook names (should match your n8n workflow names)
REACT_APP_N8N_FETCH_WEBHOOK=Fetch-Rows-Multi
REACT_APP_N8N_UPDATE_WEBHOOK=Update-Row-Multi
REACT_APP_N8N_DELETE_WEBHOOK=Delete-Row
```

## 5. Generate and Import Templates

### Configuration Format

The `REACT_APP_DOC_SHEET_CONFIG` uses this format:
- **Documents** are separated by semicolons (`;`)
- **Sheets** within each document are separated by commas (`,`)
- **Matching columns** are specified in square brackets `[columnName]` for each sheet
- **Format**: `"doc1:sheet1[matchCol1],sheet2[matchCol2];doc2:sheet3[matchCol3]"`

The matching column is used to identify existing rows for updates instead of always appending new rows.

#### Example Configurations:

```bash
# Single document with multiple sheets
REACT_APP_DOC_SHEET_CONFIG="Links:Meeting[Meeting Name],mixed[Link],Archive[ID]"

# Multiple documents with multiple sheets
REACT_APP_DOC_SHEET_CONFIG="Links:Meeting[Meeting Name],mixed[Link];Projects:Tasks[Task Name],Notes[Title],Archive[ID];Data:Raw[Timestamp],Processed[ID]"

# Single document with single sheet
REACT_APP_DOC_SHEET_CONFIG="Links:Meeting[Meeting Name]"
```

### Generate Templates

Run the script to generate your templates:

```bash
cd n8n_templates
chmod +x generate-n8n-templates.sh
./generate-n8n-templates.sh
```

### Output

The script will create JSON files named after your webhook configuration:

- `n8n_templates/output/{REACT_APP_N8N_FETCH_WEBHOOK}.json` (e.g., `Fetch-Rows-Multi.json`)
- `n8n_templates/output/{REACT_APP_N8N_UPDATE_WEBHOOK}.json` (e.g., `Update-Row-Multi.json`)
- `n8n_templates/output/{REACT_APP_N8N_DELETE_WEBHOOK}.json` (e.g., `Delete-Row.json`)

**Note**: The actual filenames will match the webhook names you specified in your `.env` file:
- `REACT_APP_N8N_FETCH_WEBHOOK` → `{value}.json`
- `REACT_APP_N8N_UPDATE_WEBHOOK` → `{value}.json`
- `REACT_APP_N8N_DELETE_WEBHOOK` → `{value}.json`

### Import to n8n

1. **Open n8n** at http://localhost:5678
2. **Import Templates**:
   - Go to "Templates" in the left sidebar
   - Click "Import from file"
   - Select the generated JSON files from `n8n_templates/output/`
   - Look for files named after your webhook configuration (e.g., `Fetch-Rows-Multi.json`, `Update-Row-Multi.json`, `Delete-Row.json`)
3. **Configure Document IDs**:
   - Open each imported workflow
   - Replace placeholder document IDs with your actual Google Sheets document IDs
   - Document IDs can be found in the URL of your Google Sheets: `https://docs.google.com/spreadsheets/d/{DOCUMENT_ID}/edit`
4. **Activate Workflows**:
   - Click the "Active" toggle to enable each workflow
   - Note the webhook URLs that appear
5. **Test Workflows**:
   - Use the webhook URLs to test fetch, update, and delete operations
   - Test delete functionality with the provided test scripts:
     ```bash
     ./test-delete.sh                    # Test delete for Links document
     ./test-delete-test-doc.sh           # Test delete for Test document
     ```

### Alternative: Import via CLI

You can also import workflows using n8n CLI commands:

```bash
# Import single workflow
n8n import:workflow --input=n8n_templates/output/Fetch-Rows-Multi.json

# Import multiple workflows
n8n import:workflow --input=./n8n_templates/output --separate --update-existing

# Import with custom names
n8n import:workflow --input=n8n_templates/output/Update-Row-Multi.json
n8n import:workflow --input=n8n_templates/output/Delete-Row.json
```

**Note**: Replace the filenames with your actual webhook names as configured in your `.env` file.

## Template Structure

### Fetch Template Structure

```
Webhook → Doc Switch → Get Row(s) nodes → Respond to Webhook
```

- **Webhook**: Receives POST requests with `doc` and `sheet` parameters
- **Doc Switch**: Routes to the correct document based on `doc` parameter
- **Get Row(s)**: Retrieves data from the specified sheet
- **Respond to Webhook**: Returns the retrieved data

### Update Template Structure

```
Webhook → Code → Doc Switch → Sheet Switch → Append/Update nodes → Respond to Webhook
```

- **Webhook**: Receives POST requests with `doc`, `sheet`, `rowIndex`, and data
- **Code**: Processes and cleans the input data
- **Doc Switch**: Routes to the correct document
- **Sheet Switch**: Routes to the correct sheet within the document
- **Append/Update**: Adds or updates rows in the specified sheet
- **Respond to Webhook**: Returns success message

### Delete Template Structure

```
Webhook → Code → Doc Switch → Delete nodes → Respond to Webhook
```

- **Webhook**: Receives POST requests with `doc`, `sheet`, and `row_number` parameters
- **Code**: Processes incoming data
- **Doc Switch**: Routes to the correct document based on `doc` parameter
- **Delete nodes**: One per document for deleting rows by row number
- **Respond to Webhook**: Returns response to client

### Key Features
- ✅ **Multi-document support**: Automatically generates nodes for each document in config
- ✅ **Dynamic sheet selection**: Uses `{{ $('Webhook').item.json.body.sheet }}` for sheet name
- ✅ **Row number targeting**: Uses `{{ $('Webhook').item.json.body.row_number }}` for row index
- ✅ **Proper error handling**: Includes response handling and error workflows
- ✅ **Optimal node positioning**: Generous spacing to prevent overlaps

## API Usage

### Fetch Data

**Endpoint**: `POST /webhook/Fetch-Rows-Multi`

**Request Body**:
```json
{
  "doc": "Links",
  "sheet": "Meeting"
}
```

**Response**: Returns all rows from the specified sheet

### Update Data

**Endpoint**: `POST /webhook/Update-Row-Multi`

**Request Body**:
```json
{
  "doc": "Links",
  "sheet": "Meeting",
  "rowIndex": 2,
  "Meeting Name": "Team Standup",
  "Summary": "Daily team meeting",
  "Status": "Completed"
}
```

**Response**: `"Row Updated"`

### Delete Data

**Endpoint**: `POST /webhook/Delete-Row`

**Request Body**:
```json
{
  "doc": "Links",
  "sheet": "Meeting",
  "row_number": 2
}
```

**Response**: Returns the deleted row data

## Importing to n8n

1. **Import Templates**: In n8n, go to Templates and import the generated JSON files
2. **Configure Credentials**: Set up your Google Sheets OAuth2 credentials
3. **Update Document IDs**: Replace the placeholder document IDs with your actual Google Sheets document IDs
4. **Test Workflows**: Test both fetch and update operations

## Important Notes

- **Document IDs**: You'll need to update the document IDs in the generated templates with your actual Google Sheets document IDs
- **Credentials**: Make sure your Google Sheets OAuth2 credential ID matches the one in your `.env` file
- **Webhook URLs**: The webhook URLs will be available after importing and activating the workflows in n8n
- **Delete Functionality**: The delete feature includes confirmation dialogs and proper error handling for safe row deletion

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure the script is executable:
   ```bash
   chmod +x generate-n8n-templates.sh
   ```

2. **Missing .env File**: Create the `.env` file from the example:
   ```bash
   cp n8n_templates/env.example md-sheet-editor/.env
   ```

3. **Invalid Configuration**: Check your `REACT_APP_DOC_SHEET_CONFIG` format follows the specified pattern

4. **Template Import Errors**: Ensure your Google Sheets credentials are properly configured in n8n

### Validation

The script validates:
- Presence of `.env` file
- Required environment variables
- Configuration format

## Customization

You can modify the script to:
- Add custom webhook paths
- Include additional node types
- Modify the response format
- Add error handling nodes

## Support

For issues or questions:
1. Check the configuration format
2. Verify your Google Sheets credentials
3. Ensure document IDs are correctly set in the templates 