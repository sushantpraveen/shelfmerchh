CauseConn Widget & API Integration Guide
Complete guide for developers integrating the CauseConn Sponsor Widget and APIs into their applications

📋 Table of Contents
Quick Start
Widget Integration
API Reference
Authentication
Complete Examples
Error Handling
Testing
Production Deployment
🚀 Quick Start
Option 1: Widget-Only Integration (Recommended for Most)
If you just want to add sponsorship functionality to your site without building your own UI:

<!-- Add this to your HTML -->
<div id="causeconn-sponsor-widget" data-cause-id="YOUR_CAUSE_ID"></div>
<script src="https://yourdomain.com/widget/embed.js"></script>
<!-- Listen for success -->
<script>
window.addEventListener('causeconnSponsorSuccess', (e) => {
  console.log('Sponsorship created:', e.detail.sponsorshipId);
});
</script>
Option 2: API Integration (For Custom UIs)
If you want to build your own sponsorship UI and use our backend:

// Create a sponsorship
const response = await fetch('https://api.yourdomain.com/api/sponsorships', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY' // Optional
  },
  body: JSON.stringify({
    cause: 'CAUSE_ID',
    organizationName: 'Acme Corp',
    contactName: 'John Doe',
    email: 'john@acme.com',
    phone: '+1234567890',
    toteQuantity: 500,
    unitPrice: 85,
    totalAmount: 42500,
    // ... more fields
  })
});
const sponsorship = await response.json();
console.log('Created:', sponsorship._id);
🎨 Widget Integration
Installation
Method 1: Script Tag (Easiest)
<!DOCTYPE html>
<html>
<head>
  <title>Sponsor a Cause</title>
</head>
<body>
  <h1>Support Our Cause</h1>
  
  <!-- Widget Container -->
  <div 
    id="causeconn-sponsor-widget"
    data-cause-id="65f8a1b2c3d4e5f6a7b8c9d0"
    data-api-key="your_api_key_here"
    data-theme="light"
  ></div>
  
  <!-- Load Widget -->
  <script src="https://yourdomain.com/widget/embed.js"></script>
  
  <!-- Handle Events -->
  <script>
    window.addEventListener('causeconnSponsorSuccess', (event) => {
      alert('Thank you! Sponsorship ID: ' + event.detail.sponsorshipId);
    });
  </script>
</body>
</html>
Method 2: Direct iframe
<iframe 
  src="https://yourdomain.com/widget/sponsor?causeId=123&theme=light"
  width="100%"
  height="600"
  frameborder="0"
  allow="payment"
></iframe>
Configuration Options
Attribute	Type	Description	Example
data-cause-id	string	Pre-select a specific cause	"65f8a1b2..."
data-api-key	string	Your API key for tracking	"sk_live_..."
data-affiliate-id	string	Affiliate/partner ID	"partner_123"
data-theme	light|dark	Visual theme	"light"
data-width	string	Widget width	"100%" or "500px"
data-min-height	string	Minimum height	"600px"
Widget Events
Listen to these events to integrate with your application:

// Widget is ready
window.addEventListener('causeconnWidgetReady', () => {
  console.log('Widget loaded');
});
// User changed step
window.addEventListener('causeconnStepChange', (event) => {
  console.log('Current step:', event.detail.step);
  // Steps: 1=Quantity, 2=Cause, 3=Logo, 4=Distribution, 5=Confirmation
});
// Sponsorship successful
window.addEventListener('causeconnSponsorSuccess', (event) => {
  const { sponsorshipId, causeId, totalAmount, organizationName } = event.detail;
  
  // Track conversion
  gtag('event', 'purchase', {
    transaction_id: sponsorshipId,
    value: totalAmount,
    currency: 'INR'
  });
  
  // Redirect to thank you page
  window.location.href = `/thank-you?id=${sponsorshipId}`;
});
// Error occurred
window.addEventListener('causeconnSponsorError', (event) => {
  console.error('Error:', event.detail.message);
  alert('Something went wrong. Please try again.');
});
🔌 API Reference
Base URL
Production: https://api.yourdomain.com
Development: http://localhost:3000
Endpoints
1. Create Sponsorship
POST /api/sponsorships

Creates a new sponsorship request.

Headers:

Content-Type: application/json
X-API-Key: YOUR_API_KEY (optional)
Request Body:

{
  "cause": "65f8a1b2c3d4e5f6a7b8c9d0",
  "organizationName": "Acme Corporation",
  "contactName": "John Doe",
  "email": "john@acme.com",
  "phone": "+1234567890",
  "toteQuantity": 500,
  "unitPrice": 85,
  "totalAmount": 42500,
  "logoUrl": "https://example.com/logo.png",
  "distributionType": "online",
  "selectedCities": ["Mumbai", "Delhi"],
  "distributionStartDate": "2026-03-01T00:00:00.000Z",
  "distributionEndDate": "2026-03-31T23:59:59.999Z",
  "message": "We're excited to support this cause!",
  "distributionLocations": [
    {
      "name": "Online Distribution",
      "address": "N/A",
      "contactPerson": "John Doe",
      "phone": "+1234567890"
    }
  ]
}
Required Fields:

cause - Cause ID (MongoDB ObjectId)
organizationName - Sponsor organization name
contactName - Contact person name
email - Contact email
phone - Contact phone number
toteQuantity - Number of totes to sponsor
unitPrice - Price per tote (in INR)
totalAmount - Total sponsorship amount (in INR)
distributionType - "online" or "physical"
selectedCities - Array of city names
distributionStartDate - Campaign start date (ISO 8601)
distributionEndDate - Campaign end date (ISO 8601)
Optional Fields:

logoUrl - URL to sponsor's logo image
message - Message from sponsor
apiKey - API key for tracking (can also be in header)
affiliateId - Affiliate ID for commission tracking
source - Source of the sponsorship (e.g., "widget", "api", "mobile_app")
paymentId - Payment transaction ID
paymentStatus - "pending" or "completed"
distributionLocations - Array of distribution location objects
Response (201 Created):

{
  "_id": "65f8a1b2c3d4e5f6a7b8c9d1",
  "cause": "65f8a1b2c3d4e5f6a7b8c9d0",
  "organizationName": "Acme Corporation",
  "contactName": "John Doe",
  "email": "john@acme.com",
  "phone": "+1234567890",
  "toteQuantity": 500,
  "unitPrice": 85,
  "totalAmount": 42500,
  "status": "pending",
  "logoStatus": "pending",
  "distributionType": "online",
  "selectedCities": ["Mumbai", "Delhi"],
  "distributionStartDate": "2026-03-01T00:00:00.000Z",
  "distributionEndDate": "2026-03-31T23:59:59.999Z",
  "createdAt": "2026-02-04T17:41:05.000Z",
  "updatedAt": "2026-02-04T17:41:05.000Z"
}
Error Responses:

// 400 Bad Request - Missing fields
{
  "message": "Missing required fields",
  "missingFields": ["email", "phone"]
}
// 400 Bad Request - Validation error
{
  "message": "Validation error",
  "errors": {
    "email": {
      "message": "Invalid email format"
    }
  }
}
// 500 Internal Server Error
{
  "message": "Error creating sponsorship",
  "error": "Database connection failed"
}
2. Get Causes
GET /api/causes

Retrieve available causes to sponsor.

Query Parameters:

status - Filter by status (e.g., approved)
category - Filter by category
isOnline - Filter by online status (true/false)
Response (200 OK):

[
  {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Clean Water Initiative",
    "description": "Providing clean water to rural communities",
    "category": "Environment",
    "imageUrl": "https://example.com/cause.jpg",
    "targetAmount": 100000,
    "currentAmount": 45000,
    "status": "approved",
    "location": "Maharashtra",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
]
3. Get Sponsorship by ID
GET /api/sponsorships/public/:id

Retrieve a specific sponsorship (public access for logo reupload).

Response (200 OK):

{
  "_id": "65f8a1b2c3d4e5f6a7b8c9d1",
  "cause": {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Clean Water Initiative"
  },
  "organizationName": "Acme Corporation",
  "status": "pending",
  "toteQuantity": 500,
  "totalAmount": 42500,
  "createdAt": "2026-02-04T17:41:05.000Z"
}
4. Reupload Logo
PATCH /api/sponsorships/:sponsorshipId/reupload

Reupload logo for a rejected sponsorship.

Request Body:

{
  "logoUrl": "https://example.com/new-logo.png"
}
Response (200 OK):

{
  "message": "Logo updated successfully and pending review",
  "sponsorship": {
    "_id": "65f8a1b2c3d4e5f6a7b8c9d1",
    "status": "pending",
    "logoUrl": "https://example.com/new-logo.png"
  }
}
🔐 Authentication
API Keys (Optional)
API keys are optional for creating sponsorships but recommended for tracking and analytics.

How to get an API key:

Contact the CauseConn team at 
support@causeconn.com
Or register at the Developer Portal (if available)
Using API keys:

// In header
fetch('/api/sponsorships', {
  headers: {
    'X-API-Key': 'your_api_key_here'
  }
})
// Or in request body
fetch('/api/sponsorships', {
  body: JSON.stringify({
    apiKey: 'your_api_key_here',
    // ... other fields
  })
})
Benefits of using API keys:

Track conversions from your platform
Access to analytics dashboard
Affiliate commission tracking (if applicable)
Priority support
💡 Complete Examples
Example 1: React Integration
import React, { useEffect, useState } from 'react';
function SponsorPage() {
  const [sponsorshipId, setSponsorshipId] = useState(null);
  useEffect(() => {
    // Listen for widget events
    const handleSuccess = (event) => {
      setSponsorshipId(event.detail.sponsorshipId);
      
      // Track with your analytics
      analytics.track('Sponsorship Created', {
        id: event.detail.sponsorshipId,
        amount: event.detail.totalAmount
      });
    };
    window.addEventListener('causeconnSponsorSuccess', handleSuccess);
    
    return () => {
      window.removeEventListener('causeconnSponsorSuccess', handleSuccess);
    };
  }, []);
  return (
    <div>
      <h1>Sponsor a Cause</h1>
      
      {sponsorshipId ? (
        <div className="success">
          <h2>Thank you!</h2>
          <p>Sponsorship ID: {sponsorshipId}</p>
        </div>
      ) : (
        <div 
          id="causeconn-sponsor-widget"
          data-cause-id="65f8a1b2c3d4e5f6a7b8c9d0"
          data-api-key={process.env.REACT_APP_CAUSECONN_API_KEY}
        />
      )}
    </div>
  );
}
export default SponsorPage;
Example 2: Custom API Integration (Node.js)
const axios = require('axios');
async function createSponsorship(data) {
  try {
    const response = await axios.post(
      'https://api.yourdomain.com/api/sponsorships',
      {
        cause: data.causeId,
        organizationName: data.orgName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        toteQuantity: data.quantity,
        unitPrice: calculateUnitPrice(data.quantity),
        totalAmount: calculateTotal(data.quantity),
        distributionType: 'online',
        selectedCities: data.cities,
        distributionStartDate: data.startDate,
        distributionEndDate: data.endDate,
        distributionLocations: [{
          name: 'Online Distribution',
          address: 'N/A',
          contactPerson: data.contactName,
          phone: data.phone
        }],
        logoUrl: data.logoUrl,
        message: data.message,
        source: 'custom_api',
        apiKey: process.env.CAUSECONN_API_KEY
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CAUSECONN_API_KEY
        }
      }
    );
    console.log('Sponsorship created:', response.data._id);
    return response.data;
    
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.data);
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}
function calculateUnitPrice(quantity) {
  if (quantity >= 50000) return 35.01;
  if (quantity >= 40000) return 39.55;
  if (quantity >= 30000) return 44.09;
  if (quantity >= 20000) return 48.64;
  if (quantity >= 10000) return 53.18;
  if (quantity >= 5000) return 57.73;
  if (quantity >= 2500) return 62.27;
  if (quantity >= 1000) return 66.82;
  if (quantity >= 500) return 71.36;
  if (quantity >= 250) return 75.91;
  if (quantity >= 100) return 80.45;
  return 85;
}
function calculateTotal(quantity) {
  return quantity * calculateUnitPrice(quantity);
}
// Usage
createSponsorship({
  causeId: '65f8a1b2c3d4e5f6a7b8c9d0',
  orgName: 'Acme Corp',
  contactName: 'John Doe',
  email: 'john@acme.com',
  phone: '+1234567890',
  quantity: 500,
  cities: ['Mumbai'],
  startDate: new Date('2026-03-01'),
  endDate: new Date('2026-03-31'),
  logoUrl: 'https://acme.com/logo.png',
  message: 'Excited to support!'
});
Example 3: WordPress Integration
<?php
// Add to your theme's functions.php
function causeconn_sponsor_widget_shortcode($atts) {
    $atts = shortcode_atts(array(
        'cause_id' => '',
        'theme' => 'light',
        'api_key' => get_option('causeconn_api_key')
    ), $atts);
    
    ob_start();
    ?>
    <div 
        id="causeconn-sponsor-widget"
        data-cause-id="<?php echo esc_attr($atts['cause_id']); ?>"
        data-theme="<?php echo esc_attr($atts['theme']); ?>"
        data-api-key="<?php echo esc_attr($atts['api_key']); ?>"
    ></div>
    <script src="https://yourdomain.com/widget/embed.js"></script>
    <script>
    window.addEventListener('causeconnSponsorSuccess', function(event) {
        // Track with WordPress
        if (typeof gtag !== 'undefined') {
            gtag('event', 'sponsorship_complete', {
                value: event.detail.totalAmount,
                currency: 'INR'
            });
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('causeconn_sponsor', 'causeconn_sponsor_widget_shortcode');
// Usage in WordPress:
// [causeconn_sponsor cause_id="65f8a1b2c3d4e5f6a7b8c9d0"]
?>
⚠️ Error Handling
Common Errors
Status	Error	Solution
400	Missing required fields	Check all required fields are present
400	Validation error	Verify data formats (email, phone, dates)
404	Cause not found	Verify the cause ID exists
500	Server error	Retry or contact support
Best Practices
async function createSponsorshipWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/sponsorships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        // Don't retry validation errors
        if (response.status === 400) {
          throw new Error(error.message);
        }
        
        // Retry server errors
        if (i === maxRetries - 1) {
          throw new Error(error.message);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      return await response.json();
      
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
🧪 Testing
Test the Widget Locally
Download the test file: 
test-widget.html
Update the WIDGET_BASE_URL to your domain
Open in browser and test the flow
Test API Endpoints
# Test creating a sponsorship
curl -X POST https://api.yourdomain.com/api/sponsorships \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "cause": "65f8a1b2c3d4e5f6a7b8c9d0",
    "organizationName": "Test Org",
    "contactName": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "toteQuantity": 100,
    "unitPrice": 80.45,
    "totalAmount": 8045,
    "distributionType": "online",
    "selectedCities": ["Mumbai"],
    "distributionStartDate": "2026-03-01T00:00:00.000Z",
    "distributionEndDate": "2026-03-31T23:59:59.999Z",
    "distributionLocations": [{
      "name": "Online",
      "address": "N/A",
      "contactPerson": "Test User",
      "phone": "+1234567890"
    }]
  }'
# Test getting causes
curl https://api.yourdomain.com/api/causes?status=approved
🚀 Production Deployment
Pre-Deployment Checklist
 Update WIDGET_BASE_URL in embed.js to production domain
 Configure CORS on backend for your domain
 Set up API keys for tracking
 Test widget on production domain
 Set up error monitoring (Sentry, etc.)
 Configure analytics tracking
 Test payment integration (if applicable)
 Set up webhook endpoints (if needed)
CORS Configuration
Ensure your domain is whitelisted in the backend CORS configuration:

// Backend: server/src/app.ts
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com'
];
Performance Tips
Load widget asynchronously:

<script async src="/widget/embed.js"></script>
Use CDN for embed script:

<script src="https://cdn.yourdomain.com/widget/embed.js"></script>
Lazy load widget:

// Load only when user scrolls to widget
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    loadWidget();
  }
});
observer.observe(document.getElementById('causeconn-sponsor-widget'));
📞 Support
Email: 
support@causeconn.com
Documentation: https://docs.causeconn.com
API Status: https://status.causeconn.com
Discord: https://discord.gg/causeconn
📝 Changelog
v1.0.0 (2026-02-04)
Initial release
Widget embed functionality
Sponsorship creation API
Event system for cross-origin communication
Theme support (light/dark)
API key support for tracking
📄 License
This integration guide is provided for developers integrating with CauseConn. Contact us for commercial licensing terms.


Comment
Ctrl+Alt+M
