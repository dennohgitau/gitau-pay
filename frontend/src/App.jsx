import { useState, useEffect, useRef } from 'react'
import { Send, Phone, Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import axios from 'axios'

function App() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState(null) // 'pending', 'completed', 'failed'
  const [statusMessage, setStatusMessage] = useState('')
  const pollingIntervalRef = useRef(null)
  const pollingTimeoutRef = useRef(null)

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    let cleaned = value.replace(/\D/g, '')
    
    // Handle +254 prefix
    if (cleaned.startsWith('254')) {
      cleaned = '0' + cleaned.slice(3)
    }
    
    // Limit to 10 digits
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(0, 10)
    }
    
    return cleaned
  }

  const formatAmount = (value) => {
    // Remove all non-digit characters except decimal point
    let cleaned = value.replace(/[^\d.]/g, '')
    
    // Only allow one decimal point
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2)
    }
    
    return cleaned
  }

  const validateForm = () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return false
    }
    
    if (!phoneNumber.startsWith('0')) {
      setError('Phone number must start with 0 (e.g., 0723241024)')
      return false
    }
    
    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0')
      return false
    }
    
    return true
  }

  const checkTransactionStatus = async (orderTrackingId) => {
    try {
      // Use environment variable or default to relative URL for production
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const response = await axios.get(
        `${apiBaseUrl}/api/transaction-status/${orderTrackingId}`
      )
      
      const statusCode = response.data.status_code
      const statusDesc = response.data.payment_status_description || 'PENDING'
      
      if (statusCode === '1') {
        // Payment completed
        setPaymentStatus('completed')
        setStatusMessage('Payment completed successfully!')
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        return true
      } else if (statusCode === '2') {
        // Payment failed
        setPaymentStatus('failed')
        setStatusMessage('Payment failed. Please try again.')
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        return true
      } else {
        // Still pending
        setPaymentStatus('pending')
        setStatusMessage('Waiting for you to enter your M-Pesa PIN...')
        return false
      }
    } catch (err) {
      console.error('Error checking status:', err)
      return false
    }
  }

  const startPolling = (orderTrackingId) => {
    // Clear any existing interval and timeout
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
    }
    
    // Check immediately
    checkTransactionStatus(orderTrackingId)
    
    // Set timeout to stop polling after 5 minutes
    pollingTimeoutRef.current = setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      setStatusMessage('Payment timeout. Please check your phone or try again.')
    }, 300000) // 5 minutes
    
    // Then poll every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      checkTransactionStatus(orderTrackingId).then((isComplete) => {
        if (isComplete && pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current)
            pollingTimeoutRef.current = null
          }
        }
      })
    }, 3000)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setPaymentStatus(null)
    setStatusMessage('')
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      // Use environment variable or default to relative URL for production
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const response = await axios.post(`${apiBaseUrl}/api/stk-push`, {
        phone_number: phoneNumber,
        amount: parseFloat(amount),
        description: description || `Payment of KES ${amount}`,
      })
      
      setResult({
        success: true,
        message: response.data.message,
        orderTrackingId: response.data.order_tracking_id,
        merchantReference: response.data.merchant_reference,
      })
      
      // Start polling for status
      setPaymentStatus('pending')
      setStatusMessage('STK push sent! Waiting for you to enter your M-Pesa PIN...')
      startPolling(response.data.order_tracking_id)
      
      // Reset form
      setPhoneNumber('')
      setAmount('')
      setDescription('')
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Failed to send STK push. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    // Clear polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
    setResult(null)
    setError(null)
    setPaymentStatus(null)
    setStatusMessage('')
    setPhoneNumber('')
    setAmount('')
    setDescription('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg mb-4">
            <Send className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gitau Pay
          </h1>
          <p className="text-gray-600">
            Send secure M-Pesa payments instantly
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-effect rounded-3xl p-8 shadow-2xl animate-slide-up">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Phone Number Input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    placeholder="0723241024"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl 
                             focus:outline-none input-focus bg-white/50"
                    required
                    disabled={loading}
                    maxLength={10}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter 10-digit Kenyan phone number
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount (KES)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-sm font-semibold text-gray-500">KSH</span>
                  </div>
                  <input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(formatAmount(e.target.value))}
                    placeholder="100.00"
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl 
                             focus:outline-none input-focus bg-white/50"
                    required
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter payment amount in Kenyan Shillings
                </p>
              </div>

              {/* Description Input */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment description"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl 
                           focus:outline-none input-focus bg-white/50"
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending STK Push...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send STK Push
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Payment Status Result */
            <div className="text-center space-y-6 animate-fade-in">
              {/* Status Icon */}
              {paymentStatus === 'completed' ? (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full animate-fade-in">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              ) : paymentStatus === 'failed' ? (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full animate-fade-in">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full animate-fade-in">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
              )}
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {paymentStatus === 'completed' 
                    ? 'Payment Successful!' 
                    : paymentStatus === 'failed'
                    ? 'Payment Failed'
                    : 'STK Push Sent!'}
                </h2>
                <p className={`text-sm mb-6 ${
                  paymentStatus === 'completed' 
                    ? 'text-green-600' 
                    : paymentStatus === 'failed'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}>
                  {statusMessage || result.message}
                </p>
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Order ID:</span>
                  <span className="text-sm font-mono text-gray-900">{result.orderTrackingId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Reference:</span>
                  <span className="text-sm font-mono text-gray-900">{result.merchantReference}</span>
                </div>
              </div>

              {/* Status-specific messages */}
              {paymentStatus === 'pending' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                    <p className="text-sm font-semibold text-blue-800">Waiting for Payment</p>
                  </div>
                  <p className="text-sm text-blue-700">
                    Please check your phone and enter your M-Pesa PIN to complete the payment.
                    This page will update automatically when payment is received.
                  </p>
                </div>
              )}

              {paymentStatus === 'completed' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in">
                  <p className="text-sm text-green-800">
                    <strong>✅ Payment Confirmed!</strong> Your payment has been successfully processed.
                  </p>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                  <p className="text-sm text-red-800">
                    <strong>❌ Payment Failed</strong> The payment could not be completed. Please try again.
                  </p>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full btn-secondary"
              >
                {paymentStatus === 'completed' || paymentStatus === 'failed'
                  ? 'Send Another Payment'
                  : 'Cancel & Send Another'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Gitau Pay</p>
          <p className="mt-1">Secure • Fast • Reliable</p>
        </div>
      </div>
    </div>
  )
}

export default App
