/**
 * BranTech Chat Assistant
 * Handles user identification, API communication, and chat functionality
 */

class ChatAssistant {
  constructor() {
    this.userKey = null;
    this.memoryId = null;
    this.isOpen = false;
    this.isLoading = false;
    this.messageHistory = [];
    
    // API endpoints
    this.chatEndpoint = 'https://n8n.bigaddict.shop/webhook/brantech/chatbot';
    this.messagesEndpoint = 'https://n8n.bigaddict.shop/webhook/brantech/messages';
    
    // DOM elements
    this.chatAssistant = document.getElementById('chatAssistant');
    this.chatToggle = document.getElementById('chatToggle');
    this.chatWindow = document.getElementById('chatWindow');
    this.chatClose = document.getElementById('chatClose');
    this.chatMessages = document.getElementById('chatMessages');
    this.chatInput = document.getElementById('chatInput');
    this.chatSend = document.getElementById('chatSend');
    this.chatTyping = document.getElementById('chatTyping');
    this.chatNotification = document.getElementById('chatNotification');
    
    this.init();
  }

  /**
   * Initialize the chat assistant
   */
  init() {
    this.initializeUser();
    this.bindEvents();
    this.loadMessageHistory();
  }

  /**
   * Initialize or retrieve user identification
   */
  initializeUser() {
    // Check if user key exists in localStorage
    this.userKey = localStorage.getItem('brantech_user_key');
    
    if (!this.userKey) {
      // Generate new random key for new user
      this.userKey = this.generateUserKey();
      localStorage.setItem('brantech_user_key', this.userKey);
      console.log('New user created with key:', this.userKey);
    } else {
      console.log('Existing user found with key:', this.userKey);
    }
    
    // Initialize memory ID (same as user key for now)
    this.memoryId = this.userKey;
  }

  /**
   * Generate a unique user key
   */
  generateUserKey() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    const userAgent = navigator.userAgent.slice(-8);
    return `user_${timestamp}_${randomStr}_${userAgent}`;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Toggle chat window
    this.chatToggle.addEventListener('click', () => this.toggleChat());
    this.chatClose.addEventListener('click', () => this.closeChat());
    
    // Send message
    this.chatSend.addEventListener('click', () => this.sendMessage());
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Enable/disable send button based on input
    this.chatInput.addEventListener('input', () => {
      const hasText = this.chatInput.value.trim().length > 0;
      this.chatSend.disabled = !hasText || this.isLoading;
    });
    
    // Close chat when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.chatAssistant.contains(e.target)) {
        this.closeChat();
      }
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeChat();
      }
    });
  }

  /**
   * Toggle chat window visibility
   */
  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  /**
   * Open chat window
   */
  openChat() {
    this.isOpen = true;
    this.chatWindow.classList.add('open');
    this.chatToggle.style.transform = 'scale(0.9)';
    this.chatInput.focus();
    this.hideNotification();
    this.scrollToBottom();
  }

  /**
   * Close chat window
   */
  closeChat() {
    this.isOpen = false;
    this.chatWindow.classList.remove('open');
    this.chatToggle.style.transform = 'scale(1)';
  }

  /**
   * Show notification badge
   */
  showNotification() {
    this.chatNotification.style.display = 'flex';
  }

  /**
   * Hide notification badge
   */
  hideNotification() {
    this.chatNotification.style.display = 'none';
  }

  /**
   * Load message history from API
   */
  async loadMessageHistory() {
    try {
      const response = await fetch(this.messagesEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memory_id: this.memoryId
        })
      });

      if (response.ok) {
        const messages = await response.json();
        console.log('Loaded message history:', messages);
        if (Array.isArray(messages) && messages.length > 0) {
          this.messageHistory = messages;
          this.displayMessageHistory();
        } else {
          console.log('No messages found in history');
        }
      } else {
        console.log('No message history found or endpoint not ready');
      }
    } catch (error) {
      console.log('Could not load message history:', error.message);
      // This is expected for new users or when endpoint is not ready
    }
  }

  /**
   * Display loaded message history
   */
  displayMessageHistory() {
    // Clear welcome message if we have history
    if (this.messageHistory.length > 0) {
      const welcomeMessage = this.chatMessages.querySelector('.chat-welcome');
      if (welcomeMessage) {
        welcomeMessage.remove();
      }
    }

    // Display each message
    this.messageHistory.forEach(message => {
      // Add user message
      this.addMessageToChat(message.request_text, 'user', false);
      // Add assistant response
      this.addMessageToChat(message.response, 'assistant', false);
    });

    this.scrollToBottom();
  }

  /**
   * Send message to chatbot
   */
  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message || this.isLoading) return;

    // Add user message to chat
    this.addMessageToChat(message, 'user');
    
    // Clear input and disable send button
    this.chatInput.value = '';
    this.chatSend.disabled = true;
    this.isLoading = true;
    
    // Show typing indicator
    this.showTyping();
    
    try {
      const response = await fetch(this.chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          memory_id: this.memoryId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Hide typing indicator
      this.hideTyping();
      
      // Add assistant response to chat
      if (data.response) {
        this.addMessageToChat(data.response, 'assistant');
        
        // Update memory ID if provided
        if (data.memory_id) {
          this.memoryId = data.memory_id;
        }
      } else {
        this.addErrorMessage('Sorry, I didn\'t receive a proper response. Please try again.');
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      this.hideTyping();
      this.addErrorMessage('Sorry, I\'m having trouble connecting. Please check your internet connection and try again.');
    } finally {
      this.isLoading = false;
      this.chatSend.disabled = false;
      this.chatInput.focus();
    }
  }

  /**
   * Add message to chat interface
   */
  addMessageToChat(content, role, animate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    const avatarSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    avatarSvg.setAttribute('viewBox', '0 0 24 24');
    avatarSvg.setAttribute('fill', 'none');
    avatarSvg.setAttribute('stroke', 'currentColor');
    avatarSvg.setAttribute('stroke-width', '2');
    
    if (role === 'user') {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '7');
      circle.setAttribute('r', '4');
      avatarSvg.appendChild(path);
      avatarSvg.appendChild(circle);
    } else {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '7');
      circle.setAttribute('r', '4');
      avatarSvg.appendChild(path);
      avatarSvg.appendChild(circle);
    }
    
    avatarDiv.appendChild(avatarSvg);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    // Add to chat messages
    this.chatMessages.appendChild(messageDiv);
    
    // Store in message history (only for new messages, not when loading from API)
    if (animate) {
      this.messageHistory.push({
        content: content,
        role: role,
        timestamp: new Date().toISOString()
      });
    }
    
    // Scroll to bottom
    this.scrollToBottom();
    
    // Show notification if chat is closed
    if (!this.isOpen && role === 'assistant') {
      this.showNotification();
    }
  }

  /**
   * Add error message to chat
   */
  addErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    
    const errorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    errorSvg.setAttribute('viewBox', '0 0 24 24');
    errorSvg.setAttribute('fill', 'none');
    errorSvg.setAttribute('stroke', 'currentColor');
    errorSvg.setAttribute('stroke-width', '2');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z');
    errorSvg.appendChild(path);
    
    const errorText = document.createElement('span');
    errorText.textContent = message;
    
    errorDiv.appendChild(errorSvg);
    errorDiv.appendChild(errorText);
    
    this.chatMessages.appendChild(errorDiv);
    this.scrollToBottom();
  }

  /**
   * Show typing indicator
   */
  showTyping() {
    this.chatTyping.style.display = 'flex';
    this.scrollToBottom();
  }

  /**
   * Hide typing indicator
   */
  hideTyping() {
    this.chatTyping.style.display = 'none';
  }

  /**
   * Scroll chat to bottom
   */
  scrollToBottom() {
    setTimeout(() => {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }, 100);
  }

  /**
   * Get user key (for debugging)
   */
  getUserKey() {
    return this.userKey;
  }

  /**
   * Get memory ID (for debugging)
   */
  getMemoryId() {
    return this.memoryId;
  }

  /**
   * Clear chat history (for debugging)
   */
  clearHistory() {
    this.messageHistory = [];
    const messages = this.chatMessages.querySelectorAll('.message, .error-message');
    messages.forEach(msg => msg.remove());
    
    // Restore welcome message
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'chat-welcome';
    welcomeDiv.innerHTML = `
      <div class="welcome-message">
        <div class="welcome-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="welcome-text">
          <p>Hello! I'm your BranTech Solutions assistant. I can help you with:</p>
          <ul>
            <li>Our services and solutions</li>
            <li>Project inquiries</li>
            <li>Technical support</li>
            <li>General questions</li>
          </ul>
          <p>What would you like to know?</p>
        </div>
      </div>
    `;
    this.chatMessages.appendChild(welcomeDiv);
  }
}

// Initialize chat assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize if chat assistant elements exist
  if (document.getElementById('chatAssistant')) {
    window.chatAssistant = new ChatAssistant();
    console.log('BranTech Chat Assistant initialized');
  }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatAssistant;
}
