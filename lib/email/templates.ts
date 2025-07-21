interface EmailTemplateData {
  customerName?: string;
  companyName?: string;
  estimateNumber?: string;
  services?: string[];
  totalAmount?: number;
  validUntil?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  projectLocation?: string;
  estimateDate?: string;
  followUpDate?: string;
  notes?: string;
  attachments?: { name: string; type: string }[];
}

const brandColors = {
  primary: "#2563eb",
  secondary: "#64748b",
  accent: "#0ea5e9",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

const baseStyles = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #334155;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.accent} 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .tagline {
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 20px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #1e293b;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: ${brandColors.primary};
      margin-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .service-list {
      background-color: #f8fafc;
      border-radius: 6px;
      padding: 15px;
      margin: 10px 0;
    }
    .service-item {
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .service-item:last-child {
      border-bottom: none;
    }
    .total-amount {
      background: linear-gradient(135deg, ${brandColors.success} 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      margin: 20px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.accent} 100%);
      color: white;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      margin: 15px 0;
      text-align: center;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 25px 20px;
      text-align: center;
      font-size: 14px;
      color: ${brandColors.secondary};
      border-top: 1px solid #e2e8f0;
    }
    .contact-info {
      background-color: #f8fafc;
      border-left: 4px solid ${brandColors.primary};
      padding: 15px;
      margin: 15px 0;
    }
    .highlight {
      background-color: #fef3c7;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .warning {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 12px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .success {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 12px;
      border-radius: 6px;
      margin: 15px 0;
    }
  </style>
`;

export const emailTemplates = {
  // Professional estimate/quote delivery
  estimate: (data: EmailTemplateData) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Building Services Estimate - ${data.estimateNumber || "EST-001"}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">EstimatePro</div>
          <div class="tagline">Professional Building Services Estimation</div>
        </div>
        
        <div class="content">
          <div class="greeting">
            Dear ${data.customerName || "Valued Customer"},
          </div>
          
          <p>Thank you for considering our building services for your project${data.projectLocation ? ` at ${data.projectLocation}` : ""}. We've prepared a detailed estimate for your review.</p>
          
          <div class="section">
            <div class="section-title">Estimate Details</div>
            <div class="contact-info">
              <strong>Estimate Number:</strong> ${data.estimateNumber || "EST-001"}<br>
              <strong>Date:</strong> ${data.estimateDate || new Date().toLocaleDateString()}<br>
              ${data.projectLocation ? `<strong>Project Location:</strong> ${data.projectLocation}<br>` : ""}
              <strong>Valid Until:</strong> <span class="highlight">${data.validUntil || "30 days from estimate date"}</span>
            </div>
          </div>

          ${
            data.services && data.services.length > 0
              ? `
          <div class="section">
            <div class="section-title">Services Included</div>
            <div class="service-list">
              ${data.services.map((service) => `<div class="service-item">✓ ${service}</div>`).join("")}
            </div>
          </div>
          `
              : ""
          }

          ${
            data.totalAmount
              ? `
          <div class="total-amount">
            Total Estimate: $${data.totalAmount.toLocaleString()}
          </div>
          `
              : ""
          }

          <div class="section">
            <div class="section-title">Next Steps</div>
            <p>To proceed with this estimate:</p>
            <ol>
              <li>Review the attached detailed estimate document</li>
              <li>Contact us with any questions or modifications needed</li>
              <li>Schedule a site visit if additional assessment is required</li>
              <li>Approve the estimate to begin project scheduling</li>
            </ol>
          </div>

          ${
            data.notes
              ? `
          <div class="section">
            <div class="section-title">Additional Notes</div>
            <p>${data.notes}</p>
          </div>
          `
              : ""
          }

          <div class="section" style="text-align: center;">
            <a href="mailto:${data.contactEmail || "contact@estimatepro.com"}?subject=Re: Estimate ${data.estimateNumber || "EST-001"}" class="cta-button">
              Contact Us About This Estimate
            </a>
          </div>
        </div>
        
        <div class="footer">
          <strong>EstimatePro</strong><br>
          Professional Building Services Estimation Platform<br>
          ${data.contactEmail || "contact@estimatepro.com"} | ${data.contactPhone || "(555) 123-4567"}
          <br><br>
          <small>This estimate was generated using AI-powered analysis and professional expertise.</small>
        </div>
      </div>
    </body>
    </html>
  `,

  // Follow-up email for pending estimates
  followUp: (data: EmailTemplateData) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Follow-up: Your Estimate ${data.estimateNumber || "EST-001"}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">EstimatePro</div>
          <div class="tagline">Following Up On Your Project</div>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${data.customerName || "there"},
          </div>
          
          <p>I wanted to follow up on the estimate we provided for your building services project${data.projectLocation ? ` at ${data.projectLocation}` : ""}.</p>
          
          <div class="contact-info">
            <strong>Estimate:</strong> ${data.estimateNumber || "EST-001"}<br>
            <strong>Originally Sent:</strong> ${data.estimateDate || "Recently"}<br>
            ${data.validUntil ? `<strong>Valid Until:</strong> <span class="highlight">${data.validUntil}</span><br>` : ""}
          </div>

          <p>We understand that reviewing estimates and making decisions takes time. We're here to help answer any questions you might have about:</p>
          
          <div class="service-list">
            <div class="service-item">📋 The scope of work and services included</div>
            <div class="service-item">💰 Pricing breakdown and payment options</div>
            <div class="service-item">📅 Project timeline and scheduling</div>
            <div class="service-item">🔧 Our methodology and equipment</div>
            <div class="service-item">📞 References and past project examples</div>
          </div>

          ${
            data.totalAmount
              ? `
          <div class="section">
            <div class="section-title">Estimate Reminder</div>
            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 6px;">
              <strong>Total Investment:</strong> $${data.totalAmount.toLocaleString()}<br>
              <small>This estimate includes all materials, labor, and our professional guarantee.</small>
            </div>
          </div>
          `
              : ""
          }

          <div class="section">
            <div class="section-title">Special Considerations</div>
            <p>To help you move forward, we can also provide:</p>
            <ul>
              <li>A virtual consultation to discuss the project in detail</li>
              <li>References from similar projects in your area</li>
              <li>Flexible scheduling options to work with your timeline</li>
              <li>Alternative service packages if budget is a concern</li>
            </ul>
          </div>

          <div class="section" style="text-align: center;">
            <a href="mailto:${data.contactEmail || "contact@estimatepro.com"}?subject=Re: Estimate ${data.estimateNumber || "EST-001"} - Follow Up" class="cta-button">
              Let's Discuss Your Project
            </a>
          </div>

          <p style="margin-top: 25px;"><em>No pressure – we're simply here when you're ready to move forward. Feel free to reach out with any questions!</em></p>
        </div>
        
        <div class="footer">
          <strong>${data.contactName || "Your EstimatePro Team"}</strong><br>
          ${data.contactEmail || "contact@estimatepro.com"} | ${data.contactPhone || "(555) 123-4567"}
          <br><br>
          <small>You're receiving this follow-up because you requested an estimate. Reply to unsubscribe from follow-ups.</small>
        </div>
      </div>
    </body>
    </html>
  `,

  // Estimate approval confirmation
  approval: (data: EmailTemplateData) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Estimate Approved - Next Steps</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">EstimatePro</div>
          <div class="tagline">Thank You For Choosing Us!</div>
        </div>
        
        <div class="content">
          <div class="success">
            🎉 <strong>Congratulations!</strong> Your estimate has been approved and we're excited to work with you.
          </div>
          
          <div class="greeting">
            Dear ${data.customerName || "Valued Customer"},
          </div>
          
          <p>Thank you for approving estimate <strong>${data.estimateNumber || "EST-001"}</strong>. We're thrilled to begin work on your project${data.projectLocation ? ` at ${data.projectLocation}` : ""}.</p>
          
          <div class="section">
            <div class="section-title">Project Summary</div>
            <div class="contact-info">
              <strong>Estimate Number:</strong> ${data.estimateNumber || "EST-001"}<br>
              <strong>Project Location:</strong> ${data.projectLocation || "To be confirmed"}<br>
              <strong>Approved Amount:</strong> $${data.totalAmount?.toLocaleString() || "TBD"}<br>
              <strong>Approval Date:</strong> ${new Date().toLocaleDateString()}
            </div>
          </div>

          ${
            data.services && data.services.length > 0
              ? `
          <div class="section">
            <div class="section-title">Services Confirmed</div>
            <div class="service-list">
              ${data.services.map((service) => `<div class="service-item">✅ ${service}</div>`).join("")}
            </div>
          </div>
          `
              : ""
          }

          <div class="section">
            <div class="section-title">What Happens Next</div>
            <ol>
              <li><strong>Project Manager Assignment</strong> - We'll assign a dedicated project manager to your account</li>
              <li><strong>Site Assessment</strong> - Final site visit to confirm all details and access requirements</li>
              <li><strong>Scheduling</strong> - We'll work with you to find the optimal start date</li>
              <li><strong>Work Commencement</strong> - Professional execution of all approved services</li>
              <li><strong>Quality Inspection</strong> - Final walkthrough and quality assurance check</li>
            </ol>
          </div>

          <div class="section">
            <div class="section-title">Important Reminders</div>
            <div class="warning">
              <strong>Before We Begin:</strong>
              <ul style="margin: 10px 0;">
                <li>Ensure site access is available during scheduled work hours</li>
                <li>Remove or protect any valuable items in work areas</li>
                <li>Inform building management/tenants of upcoming work</li>
                <li>Confirm parking availability for our equipment</li>
              </ul>
            </div>
          </div>

          <div class="section" style="text-align: center;">
            <a href="mailto:${data.contactEmail || "contact@estimatepro.com"}?subject=Project Scheduling - ${data.estimateNumber || "EST-001"}" class="cta-button">
              Schedule Your Project
            </a>
          </div>

          <p>We're committed to delivering exceptional results and will keep you informed throughout the entire process.</p>
        </div>
        
        <div class="footer">
          <strong>Your EstimatePro Project Team</strong><br>
          ${data.contactEmail || "contact@estimatepro.com"} | ${data.contactPhone || "(555) 123-4567"}
          <br><br>
          <small>Professional building services with AI-powered precision and human expertise.</small>
        </div>
      </div>
    </body>
    </html>
  `,

  // Project completion notification
  completion: (data: EmailTemplateData) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Completed Successfully</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">EstimatePro</div>
          <div class="tagline">Project Completed Successfully!</div>
        </div>
        
        <div class="content">
          <div class="success">
            ✅ <strong>Project Complete!</strong> Your building services project has been finished to our highest standards.
          </div>
          
          <div class="greeting">
            Dear ${data.customerName || "Valued Customer"},
          </div>
          
          <p>We're pleased to inform you that your building services project${data.projectLocation ? ` at ${data.projectLocation}` : ""} has been completed successfully!</p>
          
          <div class="section">
            <div class="section-title">Project Details</div>
            <div class="contact-info">
              <strong>Original Estimate:</strong> ${data.estimateNumber || "EST-001"}<br>
              <strong>Completion Date:</strong> ${new Date().toLocaleDateString()}<br>
              <strong>Services Completed:</strong> ${data.services?.length || 0} service${data.services?.length !== 1 ? "s" : ""}
            </div>
          </div>

          ${
            data.services && data.services.length > 0
              ? `
          <div class="section">
            <div class="section-title">Completed Services</div>
            <div class="service-list">
              ${data.services.map((service) => `<div class="service-item">✅ ${service}</div>`).join("")}
            </div>
          </div>
          `
              : ""
          }

          <div class="section">
            <div class="section-title">Quality Assurance</div>
            <p>Before completion, our team conducted a comprehensive quality inspection to ensure:</p>
            <div class="service-list">
              <div class="service-item">🔍 All work meets our professional standards</div>
              <div class="service-item">🧹 Complete cleanup of work areas</div>
              <div class="service-item">✅ Final walkthrough and approval</div>
              <div class="service-item">📋 Documentation of all completed work</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Warranty & Maintenance</div>
            <p>Your completed work includes:</p>
            <ul>
              <li><strong>Quality Guarantee:</strong> All work is guaranteed for defects in materials and workmanship</li>
              <li><strong>Maintenance Tips:</strong> We'll provide recommendations for ongoing care</li>
              <li><strong>Future Service:</strong> Priority booking for any future building service needs</li>
            </ul>
          </div>

          <div class="section">
            <div class="section-title">We Value Your Feedback</div>
            <p>Your satisfaction is our top priority. We'd love to hear about your experience:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="mailto:${data.contactEmail || "contact@estimatepro.com"}?subject=Feedback - Project ${data.estimateNumber || "EST-001"}" class="cta-button">
                Share Your Feedback
              </a>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Thank You</div>
            <p>Thank you for choosing EstimatePro for your building services needs. We appreciate your business and look forward to serving you again in the future.</p>
            
            <p>If you need any additional services or have questions about the completed work, please don't hesitate to contact us.</p>
          </div>
        </div>
        
        <div class="footer">
          <strong>Your EstimatePro Team</strong><br>
          ${data.contactEmail || "contact@estimatepro.com"} | ${data.contactPhone || "(555) 123-4567"}
          <br><br>
          <small>Professional building services with guaranteed satisfaction.</small>
        </div>
      </div>
    </body>
    </html>
  `,

  // Welcome email for new users
  welcome: (data: EmailTemplateData) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to EstimatePro</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">EstimatePro</div>
          <div class="tagline">Welcome to the Future of Building Services Estimation</div>
        </div>
        
        <div class="content">
          <div class="greeting">
            Welcome, ${data.customerName || "Professional"}!
          </div>
          
          <p>Thank you for joining EstimatePro, the leading AI-powered platform for building services estimation. You now have access to professional-grade tools that will transform how you approach building services projects.</p>
          
          <div class="section">
            <div class="section-title">What You Can Do With EstimatePro</div>
            <div class="service-list">
              <div class="service-item">🏗️ Create detailed estimates with 11 specialized calculators</div>
              <div class="service-item">📸 AI-powered photo analysis for instant scope assessment</div>
              <div class="service-item">📋 Document extraction from RFPs and project specifications</div>
              <div class="service-item">📊 Professional PDF estimates and proposals</div>
              <div class="service-item">📱 Mobile-optimized platform for field work</div>
              <div class="service-item">☁️ Cloud-based project management and tracking</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Getting Started</div>
            <ol>
              <li><strong>Complete Your Profile</strong> - Add company information and preferences</li>
              <li><strong>Explore the Calculator</strong> - Try our specialized service calculators</li>
              <li><strong>Upload Your First Photos</strong> - Experience AI-powered analysis</li>
              <li><strong>Create an Estimate</strong> - Generate your first professional estimate</li>
            </ol>
          </div>

          <div class="section">
            <div class="section-title">Pro Tips for Success</div>
            <div class="contact-info">
              <strong>🎯 Best Practices:</strong><br>
              • Use high-quality photos for better AI analysis<br>
              • Include detailed project notes for accurate estimates<br>
              • Review and customize all automated suggestions<br>
              • Save templates for recurring project types
            </div>
          </div>

          <div class="section" style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://estimatepro.com"}/dashboard" class="cta-button">
              Start Your First Project
            </a>
          </div>

          <div class="section">
            <div class="section-title">Need Help?</div>
            <p>Our support team is here to help you succeed:</p>
            <ul>
              <li>📚 <strong>Knowledge Base:</strong> Comprehensive guides and tutorials</li>
              <li>💬 <strong>Live Chat:</strong> Real-time support during business hours</li>
              <li>📧 <strong>Email Support:</strong> ${data.contactEmail || "support@estimatepro.com"}</li>
              <li>📞 <strong>Phone Support:</strong> ${data.contactPhone || "(555) 123-4567"}</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <strong>The EstimatePro Team</strong><br>
          Empowering professionals with AI-driven building services estimation<br>
          ${data.contactEmail || "support@estimatepro.com"} | ${data.contactPhone || "(555) 123-4567"}
        </div>
      </div>
    </body>
    </html>
  `,

  // Generic notification template
  notification: (
    data: EmailTemplateData & { subject?: string; message?: string },
  ) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.subject || "EstimatePro Notification"}</title>
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">EstimatePro</div>
          <div class="tagline">Platform Notification</div>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello ${data.customerName || "there"},
          </div>
          
          ${data.message ? `<p>${data.message}</p>` : "<p>You have a new notification from EstimatePro.</p>"}
          
          ${
            data.estimateNumber
              ? `
          <div class="contact-info">
            <strong>Related to:</strong> Estimate ${data.estimateNumber}
          </div>
          `
              : ""
          }

          <div class="section" style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://estimatepro.com"}/dashboard" class="cta-button">
              View in Dashboard
            </a>
          </div>
        </div>
        
        <div class="footer">
          <strong>EstimatePro</strong><br>
          ${data.contactEmail || "notifications@estimatepro.com"}
          <br><br>
          <small>This is an automated notification. Please do not reply to this email.</small>
        </div>
      </div>
    </body>
    </html>
  `,
};
