# MD Sheet Editor - Frontend Application

This is the React frontend application for the MD Sheet Editor project. It provides a modern, responsive interface for viewing and editing Google Sheets data through n8n workflows.

## Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Modern, eye-friendly interface
- **Inline Editing**: Edit data directly in the table
- **Pagination**: Handle large datasets efficiently
- **Search & Filter**: Find data quickly
- **Error Handling**: Graceful error management with environment validation
- **Multi-Document Support**: Switch between different Google Sheets
- **Real-time Updates**: Instant data synchronization

## Prerequisites

Before setting up the frontend, ensure you have:
1. [n8n installed and configured](n8n_templates/README-n8n-generator.md)
2. [n8n templates generated and imported](n8n_templates/README-n8n-generator.md#5-generate-and-import-templates)
3. Environment configuration completed (see main README.md for details)

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Start Development Server
```bash
npm start
```

The application will be available at http://localhost:3000

### 3. Install dependencies
```sh
npm install
```

### 4. Tailwind CSS Setup
Already configured, but if you need to re-init:
```sh
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
- `tailwind.config.js` should have:
  ```js
  content: ["./src/**/*.{js,jsx,ts,tsx}"]
  ```
- `src/index.css` should start with:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

### 5. Run locally (development)
```sh
npm start
```
- App runs at [http://localhost:3000](http://localhost:3000) (or your chosen port)

---

## Production Build & PM2 Setup

### 1. Build the app
```sh
npm run build
```
- Output is in the `build/` directory

### 2. Install a static server (e.g., `serve`)
```sh
npm install -g serve
```

### 3. Install PM2 globally (if not already)
```sh
npm install -g pm2
```

### 4. Start the app with PM2
```sh
pm2 start serve --name sheet-editor -- -s build -l 3001
```
- `--name sheet-editor` gives your process a friendly name
- `-s build` serves the `build` directory
- `-l 3001` sets the port (change as needed)

### 5. PM2 Management
- List: `pm2 list`
- Logs: `pm2 logs sheet-editor`
- Restart: `pm2 restart sheet-editor`
- Stop: `pm2 stop sheet-editor`
- Delete: `pm2 delete sheet-editor`

### 6. Auto-start on reboot (optional)
```sh
pm2 startup
pm2 save
```

---

## Mobile & Responsiveness
- The app is fully responsive and works on mobile browsers
- Table scrolls horizontally on small screens
- Modals and buttons are touch-friendly

---

## API Endpoints
- All data is fetched and updated via n8n HTTP APIs
- Endpoints are automatically built from your environment configuration
- The app will try multiple endpoints if both localhost and custom domain are configured
- The backend must support CORS for your frontend's origin
- Webhook URLs are built as: `{protocol}://{domain}{port}/webhook/{webhookName}`

---

## Tech Stack
- React (functional components, hooks)
- Tailwind CSS
- Axios
- PM2 (for production process management)
- n8n (for backend API integration)

---

## Credits
- Developed by [Your Name/Team]
- Inspired by modern data editors and sheet UIs

---

## License
[MIT] or your chosen license
