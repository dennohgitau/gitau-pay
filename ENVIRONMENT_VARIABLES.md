# Environment Variables Configuration

This document explains how to configure environment variables for different environments.

## Frontend Environment Variables

### Development (.env)

Located in: `frontend/.env`

```bash
# For local development, uncomment:
VITE_API_BASE_URL=http://localhost:8000

# For production, leave empty to use relative URLs
VITE_API_BASE_URL=
```

### Production (.env.production)

Located in: `frontend/.env.production`

```bash
# Leave empty for same-domain setup (recommended)
# Frontend and backend on same domain
VITE_API_BASE_URL=

# Or set to your API base URL if on different domain
VITE_API_BASE_URL=https://api.yourdomain.com
# or
VITE_API_BASE_URL=https://yourdomain.com
```

**How it works:**
- If `VITE_API_BASE_URL` is empty, the app uses relative URLs (e.g., `/api/stk-push`)
- If set, it prepends to API calls (e.g., `https://yourdomain.com/api/stk-push`)

## Backend Environment Variables

### Configuration File

Located in: `backend/.env`

Copy the example file:
```bash
cd backend
cp .env.example .env
nano .env
```

### Available Variables

```bash
# Pesapal API Configuration
PESAPAL_CONSUMER_KEY=your_consumer_key_here
PESAPAL_CONSUMER_SECRET=your_consumer_secret_here
PESAPAL_IPN_ID=your_ipn_id_here
PESAPAL_USE_SANDBOX=false  # Set to 'true' for sandbox testing

# CORS Configuration
# Comma-separated list of allowed origins
# For production, include your domain(s)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com,https://www.yourdomain.com

# Server Configuration
PORT=8000
ENVIRONMENT=production
```

## Environment-Specific Configurations

### Local Development

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```
PESAPAL_USE_SANDBOX=true
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
PORT=8000
ENVIRONMENT=development
```

### Production (EC2 with IP only)

**Frontend** (`frontend/.env.production`):
```
VITE_API_BASE_URL=
```

**Backend** (`backend/.env`):
```
PESAPAL_USE_SANDBOX=false
CORS_ORIGINS=http://54.165.218.113,https://54.165.218.113
PORT=8000
ENVIRONMENT=production
```

### Production (EC2 with Domain + SSL)

**Frontend** (`frontend/.env.production`):
```
VITE_API_BASE_URL=
# Or if API is on subdomain:
# VITE_API_BASE_URL=https://api.yourdomain.com
```

**Backend** (`backend/.env`):
```
PESAPAL_USE_SANDBOX=false
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PORT=8000
ENVIRONMENT=production
```

## Loading Environment Variables

### Frontend (Vite)

Vite automatically loads `.env` files:
- `.env` - loaded in all cases
- `.env.production` - loaded when building for production
- `.env.development` - loaded in development mode

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL || ''
```

**Important**: Only variables prefixed with `VITE_` are exposed to the client.

### Backend (Python)

The backend uses `os.getenv()` to read environment variables. PM2 can load from `.env` file:

```javascript
// ecosystem.config.js
env_file: '/home/ubuntu/pesapal-aws/backend/.env'
```

Or set directly in PM2:
```bash
pm2 start ecosystem.config.js --update-env
```

## Updating Environment Variables

### Frontend

1. Edit `.env` or `.env.production`
2. Rebuild the application:
```bash
cd frontend
npm run build
```

### Backend

1. Edit `backend/.env`
2. Restart PM2:
```bash
pm2 restart gitau-pay-backend
# Or reload with new env
pm2 reload gitau-pay-backend --update-env
```

## Security Best Practices

1. **Never commit `.env` files to Git**
   - Already in `.gitignore`
   - Use `.env.example` as template

2. **Use different credentials for dev/prod**
   - Sandbox credentials for development
   - Production credentials for production

3. **Restrict CORS origins**
   - Only include domains you control
   - Remove localhost in production

4. **Use environment-specific files**
   - `.env` for development
   - `.env.production` for production

## Troubleshooting

### Frontend can't connect to backend

1. Check `VITE_API_BASE_URL` is set correctly
2. Verify CORS origins include frontend URL
3. Check browser console for CORS errors
4. Verify backend is running: `pm2 status`

### CORS errors

1. Check `CORS_ORIGINS` in backend `.env`
2. Ensure frontend URL is in the list
3. Restart backend: `pm2 restart gitau-pay-backend`
4. Check browser console for exact error

### Environment variables not loading

**Frontend:**
- Ensure variable starts with `VITE_`
- Rebuild after changes: `npm run build`
- Clear browser cache

**Backend:**
- Check `.env` file exists and is readable
- Verify PM2 is loading env file
- Check PM2 logs: `pm2 logs gitau-pay-backend`

## Quick Reference

```bash
# View current environment variables (backend)
cd backend
cat .env

# View frontend env
cd frontend
cat .env.production

# Test backend env loading
cd backend
source venv/bin/activate
python3 -c "import os; print(os.getenv('CORS_ORIGINS'))"

# Reload PM2 with new env
pm2 reload gitau-pay-backend --update-env
```
