const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Global variables - Multi-session support for different firms
const clients = new Map(); // firmId -> client instance
const qrCodes = new Map(); // firmId -> qr code data
const connectionStatuses = new Map(); // firmId -> status
const messageQueues = new Map(); // firmId -> message queue
const processingStates = new Map(); // firmId -> is processing boolean

// Message queue processing for specific firm
const processMessageQueue = async (firmId) => {
  const isProcessing = processingStates.get(firmId) || false;
  const messageQueue = messageQueues.get(firmId) || [];
  const client = clients.get(firmId);
  const isClientReady = connectionStatuses.get(firmId) === 'ready';
  
  if (isProcessing || messageQueue.length === 0 || !isClientReady || !client) return;
  
  processingStates.set(firmId, true);
  console.log(`Processing ${messageQueue.length} messages in queue for firm ${firmId}`);
  
  while (messageQueue.length > 0 && isClientReady && client) {
    const messageData = messageQueue.shift();
    try {
      const formattedNumber = formatPhoneNumber(messageData.number);
      const chatId = formattedNumber + '@c.us';
      await client.sendMessage(chatId, messageData.message);
      console.log(`✅ Message sent to ${formattedNumber} for firm ${firmId}`);
      if (messageData.statusCallback) messageData.statusCallback('sent');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to send message to ${messageData.number} for firm ${firmId}:`, error.message);
      if (messageData.statusCallback) messageData.statusCallback('failed', error.message);
    }
  }
  
  processingStates.set(firmId, false);
  console.log(`✅ Queue processing completed for firm ${firmId}`);
};

// Format phone number to international format
const formatPhoneNumber = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return '91' + digits;
  if (digits.length >= 10) return '91' + digits.slice(-10);
  return digits;
};

// Initialize WhatsApp client for specific firm
const initializeClient = (firmId) => {
  console.log(`🚀 Initializing WhatsApp client for firm: ${firmId}`);
  
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: `./whatsapp-session-${firmId}` }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', (qr) => {
    console.log(`📱 QR Code received for firm ${firmId}, generating image...`);
    connectionStatuses.set(firmId, 'qr_ready');
    QRCode.toDataURL(qr, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      width: 256
    }, (err, url) => {
      if (!err) {
        qrCodes.set(firmId, url);
        console.log(`✅ QR Code generated successfully for firm ${firmId}`);
      } else {
        console.error(`❌ QR Code generation failed for firm ${firmId}:`, err);
      }
    });
  });

  client.on('ready', () => {
    console.log(`✅ WhatsApp client ready for firm ${firmId}!`);
    connectionStatuses.set(firmId, 'ready');
    qrCodes.delete(firmId); // Clear QR once connected
  });

  client.on('authenticated', () => {
    console.log(`✅ WhatsApp client authenticated for firm ${firmId}`);
    connectionStatuses.set(firmId, 'connected');
  });

  client.on('auth_failure', (msg) => {
    console.error(`❌ Authentication failed for firm ${firmId}:`, msg);
    connectionStatuses.set(firmId, 'auth_failed');
  });

  client.on('disconnected', (reason) => {
    console.log(`⚠️ WhatsApp client disconnected for firm ${firmId}:`, reason);
    connectionStatuses.set(firmId, 'disconnected');
    clients.delete(firmId);
    setTimeout(() => {
      console.log(`🔄 Attempting to reconnect firm ${firmId}...`);
      if (connectionStatuses.get(firmId) !== 'disconnected') return; // Don't reconnect if manually disconnected
      initializeClient(firmId);
    }, 5000);
  });

  clients.set(firmId, client);
  connectionStatuses.set(firmId, 'connecting');
  messageQueues.set(firmId, []);
  processingStates.set(firmId, false);
  
  client.initialize();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  const activeSessions = Array.from(clients.keys()).length;
  const totalQueueLength = Array.from(messageQueues.values()).reduce((total, queue) => total + queue.length, 0);
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    active_sessions: activeSessions,
    sessions: Array.from(clients.keys()).map(firmId => ({
      firm_id: firmId,
      status: connectionStatuses.get(firmId) || 'unknown',
      queue_length: (messageQueues.get(firmId) || []).length,
      has_qr: qrCodes.has(firmId)
    }))
  });
});

// Get connection status for specific session
app.get('/api/status/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const firmId = sessionId; // Use sessionId directly as firmId
  
  const status = connectionStatuses.get(firmId) || 'not_found';
  const ready = status === 'ready' || status === 'connected';
  const qrAvailable = qrCodes.has(firmId);
  const queueLength = (messageQueues.get(firmId) || []).length;
  
  console.log(`📊 Status check for firm ${firmId}: ${status}, ready: ${ready}, qr: ${qrAvailable}`);
  
  res.json({
    status: status,
    ready: ready,
    qr_available: qrAvailable,
    queue_length: queueLength,
    session_id: sessionId,
    firm_id: firmId,
    connected_at: ready ? new Date().toISOString() : null,
    timestamp: new Date().toISOString()
  });
});

// Connect/Generate QR for specific firm
app.post('/api/connect', async (req, res) => {
  const { sessionId, firmId } = req.body;
  
  if (!sessionId || !firmId) {
    return res.status(400).json({
      success: false,
      error: 'sessionId and firmId are required'
    });
  }
  
  // Use firmId directly as the session identifier
  const actualFirmId = firmId;
  
  console.log(`🔗 Connecting WhatsApp for firm: ${actualFirmId}`);
  
  // Initialize client if not exists
  if (!clients.has(actualFirmId)) {
    initializeClient(actualFirmId);
  }
  
  res.json({
    success: true,
    message: `WhatsApp connection initiated for firm ${actualFirmId}`,
    session_id: sessionId,
    firm_id: actualFirmId
  });
});

// Generate QR for specific firm
app.post('/api/qr', async (req, res) => {
  const { sessionId, firmId } = req.body;
  
  if (!sessionId || !firmId) {
    return res.status(400).json({
      success: false,
      error: 'sessionId and firmId are required'
    });
  }
  
  // Use firmId directly as the session identifier
  const actualFirmId = firmId;
  
  console.log(`📱 Generating QR for firm: ${actualFirmId}`);
  
  // Initialize client if not exists
  if (!clients.has(actualFirmId)) {
    initializeClient(actualFirmId);
  }
  
  // Wait a bit for QR to be generated
  let attempts = 0;
  const checkQR = () => {
    if (qrCodes.has(actualFirmId)) {
      return res.json({
        success: true,
        qr_code: qrCodes.get(actualFirmId),
        session_id: sessionId,
        message: 'Scan this QR code with WhatsApp'
      });
    }
    
    attempts++;
    if (attempts >= 30) { // 15 seconds timeout
      return res.status(408).json({
        success: false,
        error: 'QR code generation timeout'
      });
    }
    
    setTimeout(checkQR, 500);
  };
  
  setTimeout(checkQR, 500);
});

// Disconnect specific firm
app.post('/api/disconnect', async (req, res) => {
  const { sessionId, firmId } = req.body;
  
  if (!sessionId || !firmId) {
    return res.status(400).json({
      success: false,
      error: 'sessionId and firmId are required'
    });
  }
  
  // Use firmId directly (sessionId should be the same as firmId)
  const actualFirmId = firmId;
  
  console.log(`🔌 Disconnecting WhatsApp for firm: ${actualFirmId}`);
  
  const client = clients.get(actualFirmId);
  if (client) {
    try {
      await client.destroy();
      console.log(`✅ Client destroyed for firm ${actualFirmId}`);
    } catch (error) {
      console.error(`❌ Error destroying client for firm ${actualFirmId}:`, error);
    }
  }
  
  // Clean up all data for this firm
  clients.delete(actualFirmId);
  qrCodes.delete(actualFirmId);
  connectionStatuses.set(actualFirmId, 'disconnected');
  messageQueues.delete(actualFirmId);
  processingStates.delete(actualFirmId);
  
  res.json({
    success: true,
    message: `WhatsApp disconnected for firm ${actualFirmId}`
  });
});

// Send bulk messages for specific firm
app.post('/api/send-bulk-messages', async (req, res) => {
  const { messages, firmId } = req.body;
  
  if (!firmId) {
    return res.status(400).json({
      success: false,
      error: 'firmId is required'
    });
  }
  
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Messages array is required and cannot be empty'
    });
  }
  
  const isClientReady = connectionStatuses.get(firmId) === 'ready';
  if (!isClientReady) {
    return res.status(503).json({
      success: false,
      error: `WhatsApp client is not ready for firm ${firmId}. Current status: ${connectionStatuses.get(firmId) || 'disconnected'}`
    });
  }
  
  const messageQueue = messageQueues.get(firmId) || [];
  const results = [];
  
  messages.forEach((msg, index) => {
    if (!msg.number || !msg.message) {
      results.push({
        index,
        success: false,
        error: 'Number and message are required'
      });
      return;
    }
    const messageId = uuidv4();
    messageQueue.push({
      id: messageId,
      number: msg.number,
      message: msg.message,
      timestamp: new Date().toISOString()
    });
    results.push({
      index,
      success: true,
      message_id: messageId,
      status: 'queued'
    });
  });
  
  messageQueues.set(firmId, messageQueue);
  processMessageQueue(firmId);
  
  res.json({
    success: true,
    message: `${results.filter(r => r.success).length} messages queued successfully for firm ${firmId}`,
    results,
    queue_length: messageQueue.length
  });
});

// Send event notifications for specific firm
app.post('/api/send-event-messages', async (req, res) => {
  const { event, staff_list, staff_assignments, firmId } = req.body;
  
  if (!firmId) {
    return res.status(400).json({
      success: false,
      error: 'firmId is required'
    });
  }
  
  if (!event || !Array.isArray(staff_list) || staff_list.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Event data and staff list are required'
    });
  }
  
  const isClientReady = connectionStatuses.get(firmId) === 'ready';
  if (!isClientReady) {
    return res.status(503).json({
      success: false,
      error: `WhatsApp client is not ready for firm ${firmId}. Current status: ${connectionStatuses.get(firmId) || 'disconnected'}`
    });
  }
  const staffDayAssignments = {};
  if (staff_assignments && Array.isArray(staff_assignments)) {
    staff_assignments.forEach(assignment => {
      if (!staffDayAssignments[assignment.staff_id]) staffDayAssignments[assignment.staff_id] = [];
      staffDayAssignments[assignment.staff_id].push({
        day_number: assignment.day_number,
        day_date: assignment.day_date,
        role: assignment.role
      });
    });
    Object.keys(staffDayAssignments).forEach(staffId => {
      staffDayAssignments[staffId].sort((a, b) => a.day_number - b.day_number);
    });
  }
  const messages = [];
  staff_list.forEach(staff => {
    const assignments = staffDayAssignments[staff.id] || [];
    if (assignments.length > 0) {
      assignments.forEach(assignment => {
        const message = formatEventMessage(event, staff, assignment);
        messages.push({
          number: staff.mobile_number,
          message: message,
          staff_id: staff.id,
          day_number: assignment.day_number
        });
      });
    } else {
      const message = formatEventMessage(event, staff, null);
      messages.push({
        number: staff.mobile_number,
        message: message,
        staff_id: staff.id,
        day_number: 1
      });
    }
  });
  messages.sort((a, b) => a.day_number - b.day_number);
  const messageQueue = messageQueues.get(firmId) || [];
  const results = [];
  
  messages.forEach((msg, index) => {
    const messageId = uuidv4();
    messageQueue.push({
      id: messageId,
      number: msg.number,
      message: msg.message,
      timestamp: new Date().toISOString(),
      type: 'event',
      event_id: event.id,
      staff_id: msg.staff_id,
      day_number: msg.day_number
    });
    results.push({
      index,
      staff_id: msg.staff_id,
      day_number: msg.day_number,
      success: true,
      message_id: messageId,
      status: 'queued'
    });
  });
  
  messageQueues.set(firmId, messageQueue);
  processMessageQueue(firmId);
  
  res.json({
    success: true,
    message: `Event notifications queued for ${staff_list.length} staff members for firm ${firmId}`,
    event_title: event.title,
    results,
    queue_length: messageQueue.length
  });
});

// Send task notifications for specific firm
app.post('/api/send-task-messages', async (req, res) => {
  const { task, staff_list, firmId } = req.body;
  
  if (!firmId) {
    return res.status(400).json({
      success: false,
      error: 'firmId is required'
    });
  }
  
  if (!task || !Array.isArray(staff_list) || staff_list.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Task data and staff list are required'
    });
  }
  
  const isClientReady = connectionStatuses.get(firmId) === 'ready';
  if (!isClientReady) {
    return res.status(503).json({
      success: false,
      error: `WhatsApp client is not ready for firm ${firmId}. Current status: ${connectionStatuses.get(firmId) || 'disconnected'}`
    });
  }
  const messages = staff_list.map(staff => {
    const message = formatTaskMessage(task, staff);
    return { number: staff.mobile_number, message: message };
  });
  const messageQueue = messageQueues.get(firmId) || [];
  const results = [];
  
  messages.forEach((msg, index) => {
    const messageId = uuidv4();
    messageQueue.push({
      id: messageId,
      number: msg.number,
      message: msg.message,
      timestamp: new Date().toISOString(),
      type: 'task',
      task_id: task.id
    });
    results.push({
      index,
      staff_id: staff_list[index].id,
      success: true,
      message_id: messageId,
      status: 'queued'
    });
  });
  
  messageQueues.set(firmId, messageQueue);
  processMessageQueue(firmId);
  
  res.json({
    success: true,
    message: `Task notifications queued for ${staff_list.length} staff members for firm ${firmId}`,
    task_title: task.title,
    results,
    queue_length: messageQueue.length
  });
});

// Clear message queue for specific firm
app.post('/api/clear-queue', (req, res) => {
  const { firmId } = req.body;
  
  if (!firmId) {
    return res.status(400).json({
      success: false,
      error: 'firmId is required'
    });
  }
  
  const messageQueue = messageQueues.get(firmId) || [];
  const queueLength = messageQueue.length;
  messageQueues.set(firmId, []);
  
  res.json({
    success: true,
    message: `Cleared ${queueLength} messages from queue for firm ${firmId}`
  });
});

// Get queue status for specific firm
app.get('/api/queue/:firmId', (req, res) => {
  const firmId = req.params.firmId;
  const messageQueue = messageQueues.get(firmId) || [];
  const isProcessing = processingStates.get(firmId) || false;
  
  res.json({
    success: true,
    firm_id: firmId,
    queue_length: messageQueue.length,
    is_processing: isProcessing,
    messages: messageQueue.slice(0, 10)
  });
});

// Message formatting functions with single-asterisk WhatsApp bold
const formatEventMessage = (event, staff, assignment) => {
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'undefined' || dateString === 'null') return 'Date not specified';
    try {
      let date;
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateString + 'T00:00:00');
      } else {
        date = new Date(dateString);
      }
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Date formatting error';
    }
  };

  const getOrdinalNumber = (num) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  let message = `*EVENT ASSIGNMENT*\n\n`;
  message += `Hello *${staff.full_name}*,\n\n`;
  if (assignment) {
    const dayText = getOrdinalNumber(assignment.day_number);
    message += `You are assigned as *${assignment.role.toUpperCase()}* on *DAY ${dayText}* for the following event:\n\n`;
    message += `*Title*: ${event.title || 'Not specified'}\n`;
    message += `*Type*: ${event.eventType || event.event_type || 'Not specified'}\n`;
    
    // For multi-day events, show full date range
    if ((event.totalDays || event.total_days) && (event.totalDays > 1 || event.total_days > 1)) {
      const startDate = new Date((event.eventDate || event.event_date) + 'T00:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (event.totalDays || event.total_days) - 1);
      const startFormatted = startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const endFormatted = endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      message += `*Date*: ${startFormatted} - ${endFormatted}\n`;
    } else {
      message += `*Date*: ${formatDate(assignment.day_date)}\n`;
    }
  } else {
    message += `You are assigned as *${(event.role || staff.role || 'STAFF').toUpperCase()}* for the following event:\n\n`;
    message += `*Title*: ${event.title || 'Not specified'}\n`;
    message += `*Type*: ${event.eventType || event.event_type || 'Not specified'}\n`;
    if ((event.totalDays || event.total_days) && (event.totalDays > 1 || event.total_days > 1)) {
      const startDate = new Date((event.eventDate || event.event_date) + 'T00:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (event.totalDays || event.total_days) - 1);
      const startFormatted = startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const endFormatted = endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      message += `*Date*: ${startFormatted} - ${endFormatted}\n`;
    } else {
      message += `*Date*: ${formatDate(event.eventDate || event.event_date)}\n`;
    }
  }
  if (event.clientName || event.client_name) {
    message += `*Client*: ${event.clientName || event.client_name}\n`;
  }
  if (event.venue && event.venue.trim() !== '') {
    message += `*Venue*: ${event.venue}\n`;
  }
  message += `*Contact*: ${staff.mobile_number}\n`;
  if (event.description && event.description.trim() !== '') {
    message += `\n_${event.description}_\n`;
  }
  message += `\nThank you for being part of *Prit Photo*`;
  return message;
};

const formatTaskMessage = (task, staff) => {
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'undefined' || dateString === 'null') return 'Date not specified';
    try {
      let date;
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateString + 'T00:00:00');
      } else {
        date = new Date(dateString);
      }
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Date formatting error';
    }
  };

  let message = `*TASK ASSIGNMENT*\n\n`;
  message += `Hello *${staff.full_name}*,\n\n`;
  message += `You have been assigned a new task:\n\n`;
  message += `*Title*: ${task.title || 'Not specified'}\n`;
  message += `*Type*: ${task.taskType || task.task_type || 'General'}\n`;
  message += `*Priority*: ${task.priority || 'Medium'}\n`;
  if (task.dueDate || task.due_date) {
    message += `*Due*: ${formatDate(task.dueDate || task.due_date)}\n`;
  }
  if (task.eventTitle || task.event_title) {
    message += `*Event*: ${task.eventTitle || task.event_title}\n`;
  }
  if (task.amount && task.amount > 0) {
    message += `*Amount*: ₹${task.amount.toLocaleString()}\n`;
  }
  if (task.description && task.description.trim() !== '') {
    message += `\n*Details:*\n_${task.description}_\n`;
  }
  message += `\nThank you for being part of *Prit Photo*`;
  return message;
};

// Process queue every 30 seconds for all firms
cron.schedule('*/30 * * * * *', () => {
  Array.from(clients.keys()).forEach(firmId => {
    const messageQueue = messageQueues.get(firmId) || [];
    const isClientReady = connectionStatuses.get(firmId) === 'ready';
    const isProcessing = processingStates.get(firmId) || false;
    
    if (messageQueue.length > 0 && isClientReady && !isProcessing) {
      console.log(`⏰ Cron: Processing message queue for firm ${firmId}...`);
      processMessageQueue(firmId);
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Multi-Firm Service running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🏢 Firm-isolated sessions ready`);
});
