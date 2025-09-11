import { logger } from './logger.js';

// Example usage of the custom logger wrapper

// Basic usage
logger.info('scraping', 'Starting scraping process');
logger.error('scraping', 'Failed to load page', { url: 'https://example.com', error: 'Timeout' });

// With detailed context
logger.info('searchAndCopyGpt', 'Question processed successfully', {
  question: 'What is the best AI tool?',
  questionIndex: 1,
  totalQuestions: 10,
  processingTime: '2.5s',
  answerLength: 1500
});

// Error logging with stack trace
logger.error('copyAnswer', 'Failed to copy answer from clipboard', {
  question: 'Sample question',
  retryCount: 3,
  error: 'Clipboard content unchanged',
  timestamp: new Date().toISOString()
});

// Warning with context
logger.warn('enableWebSearch', 'Web search took longer than expected', {
  expectedTime: '2s',
  actualTime: '5s',
  question: 'Complex question about AI'
});

// Debug information
logger.debug('clearInput', 'Input field cleared successfully', {
  selector: 'div#prompt-textarea[contenteditable="true"]',
  method: 'keyboard.press'
});

// Scraping progress
logger.info('scrapingEntry', 'Processing question batch', {
  currentQuestion: 5,
  totalQuestions: 20,
  progress: '25%',
  estimatedTimeRemaining: '15 minutes'
});

// API request logging
logger.info('api', 'Request received', {
  method: 'POST',
  endpoint: '/api/scraping',
  userId: 'user123',
  requestId: 'req-456'
});

// File operations
logger.info('csvExporter', 'CSV file exported successfully', {
  filename: 'reports/2025-01-15_1.csv',
  recordCount: 100,
  fileSize: '2.5MB'
});
