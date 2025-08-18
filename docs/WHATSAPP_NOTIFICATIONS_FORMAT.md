# WhatsApp Notifications Format Guide

## Brand Standards
- **Brand Name**: Always use **PRIT PHOTO** (bold)
- **Tagline**: Always end with *#aJourneyOfLoveByPritPhoto* (italic)
- **Contact**: Always include "📞 Contact: +91 72850 72603"

## Message Templates

### 1. Event Confirmation Notification
```
**EVENT CONFIRMED**

Dear *[CLIENT_NAME]*,

Your event has been successfully confirmed:

*Event:* [EVENT_NAME]
*Date:* [EVENT_DATE]
*Venue:* [VENUE]
*Amount:* ₹[TOTAL_AMOUNT]

Thank you for choosing *PRIT PHOTO*
*#aJourneyOfLoveByPritPhoto*
Contact: +91 72850 72603
```

### 2. Payment Received Notification
```
**PAYMENT RECEIVED**

Dear *[CLIENT_NAME]*,

We have successfully received your payment:

*Event:* [EVENT_NAME]
*Amount Paid:* ₹[AMOUNT_PAID]
*Payment Method:* [PAYMENT_METHOD]
*Remaining Balance:* [BALANCE_STATUS]

Thank you for choosing *PRIT PHOTO*
*#aJourneyOfLoveByPritPhoto*
Contact: +91 72850 72603
```

### 3. Event Cancellation Notification
```
**EVENT CANCELLED**

Dear *[CLIENT_NAME]*,

We wish to inform you that the following event has been cancelled at the client's request:

*Event:* [EVENT_NAME]
*Date:* [EVENT_DATE]
*Venue:* [VENUE]

Our team will be in touch shortly to assist you with:
• Full refund process (if applicable)
• Rescheduling options
• Alternative arrangements

We appreciate your understanding and remain available for any support you may need.

Thank you for choosing *PRIT PHOTO*
*#aJourneyOfLoveByPritPhoto*
Contact: +91 72850 72603
```

### 4. Staff Assignment Notification
```
**NEW ASSIGNMENT**

Dear *[STAFF_NAME]*,

You have been assigned to a new event:

*Event:* [EVENT_NAME]
*Date:* [EVENT_DATE]
*Role:* [ROLE]
*Venue:* [VENUE]

Thank you for choosing *PRIT PHOTO*
*#aJourneyOfLoveByPritPhoto*
Contact: +91 72850 72603
```

### 5. Salary Payment Notification
```
**SALARY PAYMENT**

Dear *[STAFF_NAME]*,

Your salary payment has been processed:

*Amount:* ₹[AMOUNT]
*Payment Method:* [METHOD]
*Event:* [EVENT_NAME] (if applicable)

Thank you for choosing *PRIT PHOTO*
*#aJourneyOfLoveByPritPhoto*
Contact: +91 72850 72603
```

## Dynamic Messages

### For Payment Notifications:
- **Fully Paid**: "Your payment is now complete! 🎉 We're all set to capture your special moments perfectly."
- **Partial Payment**: "Please note that ₹[REMAINING] is still pending. We appreciate your continued trust in our services."

## Formatting Rules
1. Use **bold** for brand name "PRIT PHOTO"
2. Use *italic* for tagline "#aJourneyOfLoveByPritPhoto"
3. Use **bold** for client/staff names and important labels
4. Use emojis sparingly and appropriately
5. Keep messages concise and professional
6. Always include contact information
7. End with the tagline in italic

## Technical Implementation
- All messages should be sent through the firm-specific WhatsApp session
- Include firmId in all notification requests
- Handle phone number formatting for Indian numbers (+91)
- Log all notification attempts for debugging