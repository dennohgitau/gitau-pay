# Gitau Pay Application

A modern, beautiful web application for sending Pesapal STK push payments with an intuitive UI/UX.

## 🚀 Features

- **Modern UI/UX**: Beautiful, responsive design with smooth animations
- **Real-time Validation**: Instant form validation with helpful error messages
- **Secure Payments**: Direct integration with Pesapal API 3.0
- **Fast & Reliable**: Built with FastAPI and React for optimal performance
- **Mobile Responsive**: Works seamlessly on all devices

## 📁 Project Structure

```
pesapal-aws/
├── backend/           # FastAPI backend
│   ├── main.py       # API server
│   └── requirements.txt
├── frontend/         # React frontend
│   ├── src/
│   │   ├── App.jsx  # Main application component
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites

- Python 3.8+ (for backend)
- Node.js 18+ and npm (for frontend)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd pesapal-aws/backend
```

2. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd pesapal-aws/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 📖 Usage

1. Open the application in your browser (http://localhost:5173)
2. Enter the customer's phone number (10 digits, starting with 0)
3. Enter the payment amount in Kenyan Shillings (KES)
4. Optionally add a payment description
5. Click "Send STK Push"
6. The customer will receive an M-Pesa prompt on their phone
7. Once they complete the payment, you'll see the transaction details

## 🔧 Configuration

### API Credentials

The application uses production Pesapal credentials configured in `backend/main.py`:

- **Consumer Key**: Configured from existing project
- **Consumer Secret**: Configured from existing project
- **Base URL**: Production Pesapal API endpoint
- **IPN ID**: Default IPN notification ID

To modify these settings, edit `backend/main.py`:

```python
CONSUMER_KEY = "your-consumer-key"
CONSUMER_SECRET = "your-consumer-secret"
BASE_URL = PRODUCTION_BASE_URL  # or SANDBOX_BASE_URL for testing
DEFAULT_IPN_ID = "your-ipn-id"
```

## 🎨 UI/UX Features

- **Gradient Backgrounds**: Modern gradient design
- **Glass Morphism**: Translucent cards with backdrop blur
- **Smooth Animations**: Fade-in and slide-up animations
- **Icon Integration**: Lucide React icons for better visual communication
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Form Validation**: Real-time input validation with helpful messages
- **Loading States**: Clear feedback during API calls
- **Error Handling**: User-friendly error messages
- **Success States**: Clear confirmation with transaction details

## 🔒 Security

- CORS protection configured for frontend origins
- Input validation on both frontend and backend
- Phone number formatting and validation
- Amount validation (positive numbers only)
- Secure API communication

## 📝 API Endpoints

### POST `/api/stk-push`

Send an STK push to a customer's phone.

**Request Body:**
```json
{
  "phone_number": "0723241024",
  "amount": 100.00,
  "description": "Payment description",
  "customer_name": "John Doe",
  "customer_email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "STK push sent successfully...",
  "order_tracking_id": "...",
  "merchant_reference": "..."
}
```

### GET `/api/transaction-status/{order_tracking_id}`

Get the status of a transaction.

**Response:**
```json
{
  "success": true,
  "status": "...",
  "status_code": "1",
  "payment_status_description": "COMPLETED",
  "confirmation_code": "..."
}
```

## 🚀 Production Deployment

### Backend

For production, use a production ASGI server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Or use PM2 (as per project preference):
```bash
pm2 start main.py --interpreter python3 --name pesapal-api
```

### Frontend

Build for production:

```bash
cd frontend
npm run build
```

Serve the `dist` folder with a web server like Nginx or serve it from your backend.

## 📄 License

This project uses Pesapal API 3.0 for payment processing.

## 🤝 Support

For issues or questions, please refer to the Pesapal API documentation or contact support.
