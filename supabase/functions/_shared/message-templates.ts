/**
 * Professional WhatsApp Message Templates
 * Centralized message formatting for consistent communication
 */

export class MessageTemplates {
  /**
   * Task status update message
   */
  static taskUpdate(taskTitle: string, status: string, assignee?: string): string {
    return `*TASK STATUS UPDATE*

*Task:* ${taskTitle}
*Status:* ${status}
${assignee ? `*Assigned to:* ${assignee}` : ''}

*Thank you for* your cooperation`;
  }

  /**
   * Payment reminder message
   */
  static paymentReminder(clientName: string, amount: number, eventName?: string): string {
    return `*PAYMENT REMINDER*

Dear *${clientName}*,

${eventName ? `*Event:* ${eventName}\n` : ''}*Outstanding Amount:* ₹${amount.toLocaleString('en-IN')}

Please settle the payment at your earliest convenience.

*Thank you for* your business`;
  }

  /**
   * Payment received notification message
   */
  static paymentReceived(clientName: string, amount: number, eventName: string, remainingBalance: number, paymentMethod: string): string {
    return `*PAYMENT RECEIVED* ✅

Dear *${clientName}*,

We have successfully received your payment for:

*Event:* ${eventName}
*Amount Paid:* ₹${amount.toLocaleString('en-IN')}
*Payment Method:* ${paymentMethod}
*Remaining Balance:* ${remainingBalance > 0 ? `₹${remainingBalance.toLocaleString('en-IN')}` : '_Fully Paid_ ✅'}

${remainingBalance > 0 ? 
  `Your remaining balance is ₹${remainingBalance.toLocaleString('en-IN')}. We'll keep you updated on future payments.` : 
  `🎉 Congratulations! Your payment is now *complete* for this event.`
}

Thank you for trusting *PRIT PHOTO*`;
  }

  /**
   * Event update message
   */
  static eventUpdate(eventName: string, clientName: string, updateType: string, details: string): string {
    return `*EVENT UPDATE*

*${updateType}*

*Event:* ${eventName}
*Client:* ${clientName}

_Details:_ ${details}

*Thank you for* your cooperation`;
  }

  /**
   * Freelancer assignment message
   */
  static freelancerAssignment(freelancerName: string, taskTitle: string, deadline?: string): string {
    return `*TASK ASSIGNMENT*

Hello *${freelancerName}*,

*Task:* ${taskTitle}
${deadline ? `*Deadline:* ${deadline}` : ''}

Please confirm receipt and start working on this task.

*Thank you for* being part of our team`;
  }

  /**
   * General notification message
   */
  static generalNotification(title: string, message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info'): string {
    return `*${title}*

${message}

*Thank you for* your attention`;
  }

  /**
   * Test message
   */
  static testMessage(): string {
    return `*WHATSAPP TEST MESSAGE*

This is a test message from your Team Management System WhatsApp integration.

*Status:* Connected Successfully
*Time:* ${new Date().toLocaleString('en-IN')}

Your WhatsApp integration is working perfectly!

*Thank you for* using our system`;
  }

  /**
   * Welcome message for new team members
   */
  static welcomeMessage(name: string, role: string, firmName: string): string {
    return `*WELCOME TO THE TEAM*

Hello *${name}*,

Welcome to *${firmName}*! You have been added as a *${role}*.

You will now receive important updates and notifications through WhatsApp.

If you have any questions, please reach out to your manager.

*Thank you for* joining our team`;
  }

  /**
   * Deadline reminder message
   */
  static deadlineReminder(taskTitle: string, deadline: string, daysLeft: number): string {
    return `*DEADLINE REMINDER*

*Task:* ${taskTitle}
*Deadline:* ${deadline}
*Time Left:* ${daysLeft} day${daysLeft !== 1 ? 's' : ''}

${daysLeft <= 1 ? '*URGENT:* Please complete as soon as possible!' : 'Please plan accordingly.'}

*Thank you for* your attention`;
  }

  /**
   * Project milestone message
   */
  static projectMilestone(projectName: string, milestone: string, completionPercentage: number): string {
    const progressBar = this.createProgressBar(completionPercentage);
    
    return `*MILESTONE ACHIEVED*

*Project:* ${projectName}
*Milestone:* ${milestone}

*Progress:* ${completionPercentage}%
${progressBar}

Great work team!

*Thank you for* your dedication`;
  }

  /**
   * Get emoji for task status
   */
  private static getStatusEmoji(status: string): string {
    const statusEmojis: Record<string, string> = {
      'pending': '⏳',
      'in progress': '🔄',
      'in_progress': '🔄',
      'completed': '✅',
      'cancelled': '❌',
      'on hold': '⏸️',
      'on_hold': '⏸️',
      'review': '👀',
      'approved': '✅',
      'rejected': '❌'
    };
    
    return statusEmojis[status.toLowerCase()] || '📝';
  }

  /**
   * Get emoji for update type
   */
  private static getUpdateEmoji(updateType: string): string {
    const updateEmojis: Record<string, string> = {
      'schedule change': '📅',
      'venue change': '📍',
      'completion': '✅',
      'cancellation': '❌',
      'postponement': '⏸️',
      'confirmation': '✅',
      'payment received': '💰',
      'delivery': '📦'
    };
    
    return updateEmojis[updateType.toLowerCase()] || '📢';
  }

  /**
   * Get emoji for notification type
   */
  private static getNotificationEmoji(type: string): string {
    const notificationEmojis: Record<string, string> = {
      'info': 'ℹ️',
      'warning': '⚠️',
      'success': '✅',
      'error': '❌'
    };
    
    return notificationEmojis[type] || 'ℹ️';
  }

  /**
   * Create a visual progress bar
   */
  private static createProgressBar(percentage: number, length: number = 10): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Format phone number for WhatsApp
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it starts with 91 and has 12 digits, it's already formatted for India
    if (digits.startsWith('91') && digits.length === 12) {
      return digits;
    }
    
    // If it starts with 0 and has 11 digits, remove the 0 and add 91
    if (digits.startsWith('0') && digits.length === 11) {
      return '91' + digits.substring(1);
    }
    
    // If it has 10 digits, add 91 prefix for India
    if (digits.length === 10) {
      return '91' + digits;
    }
    
    // Return as-is for other formats
    return digits;
  }

  /**
   * Validate message length
   */
  static validateMessageLength(message: string, maxLength: number = 4096): boolean {
    return message.length <= maxLength;
  }

  /**
   * Truncate message if too long
   */
  static truncateMessage(message: string, maxLength: number = 4096): string {
    if (message.length <= maxLength) {
      return message;
    }
    
    return message.substring(0, maxLength - 3) + '...';
  }
}