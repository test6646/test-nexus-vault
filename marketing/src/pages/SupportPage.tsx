import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  QuestionIcon, 
  ChartAverageIcon,
  Mail01Icon,
  SmartPhone01Icon, 
  WhatsappIcon,
  Search01Icon,
  ArrowRight01Icon,
  BookOpen01Icon,
  Video01Icon,
  CustomerSupportIcon,
} from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const SupportPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const supportOptions = [
    {
      title: 'Live Chat Support',
      description: 'Get instant help from our support team during business hours.',
      icon: ChartAverageIcon,
      action: 'Start Chat',
      availability: 'Mon-Fri, 9 AM - 6 PM IST',
      response: 'Usually responds in 5-10 minutes'
    },
    {
      title: 'Email Support',
      description: 'Send detailed questions and get comprehensive answers via email.',
      icon: Mail01Icon,
      action: 'Send Email',
      availability: '24/7',
      response: 'Usually responds within 6-12 hours'
    },
    {
      title: 'Phone Support',
      description: 'Speak directly with our technical experts for complex issues.',
      icon: SmartPhone01Icon,
      action: 'Call Now',
      availability: 'Mon-Fri, 10 AM - 5 PM IST',
      response: 'Immediate assistance'
    },
    {
      title: 'WhatsApp Support',
      description: 'Quick support via WhatsApp for urgent queries.',
      icon: WhatsappIcon,
      action: 'Message on WhatsApp',
      availability: 'Mon-Fri, 9 AM - 6 PM IST',
      response: 'Usually responds in 10-15 minutes'
    }
  ];

  const faqCategories = ['All', 'Getting Started', 'Billing', 'Features', 'Technical', 'Integrations'];

  const faqs = [
    {
      question: 'How do I get started with Stoodiora?',
      answer: 'Simply sign up for a free trial, create your first firm, and start adding your clients and events. Our onboarding guide will walk you through each step.',
      category: 'Getting Started'
    },
    {
      question: 'Can I import my existing client data?',
      answer: 'Yes! Stoodiora supports importing data from Excel/CSV files and Google Sheets. You can also manually add clients one by one.',
      category: 'Getting Started'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, UPI, and net banking through our secure Razorpay integration.',
      category: 'Billing'
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time. Your data will be preserved for 30 days after cancellation.',
      category: 'Billing'
    },
    {
      question: 'How does the WhatsApp integration work?',
      answer: 'Connect your WhatsApp Business account to send automated notifications for event confirmations, payment reminders, and staff assignments.',
      category: 'Integrations'
    },
    {
      question: 'Is my data secure with Stoodiora?',
      answer: 'Absolutely! We use enterprise-grade encryption, secure cloud storage, and regular backups to protect your data.',
      category: 'Technical'
    },
    {
      question: 'Can multiple team members access the same account?',
      answer: 'Yes! You can add staff members with different permission levels - admin, manager, or staff access.',
      category: 'Features'
    },
    {
      question: 'Do you offer custom integrations?',
      answer: 'Yes, we can develop custom integrations for enterprise clients. Contact our sales team to discuss your requirements.',
      category: 'Integrations'
    }
  ];

  const resources = [
    {
      title: 'Video Tutorials',
      description: 'Step-by-step video guides for all features',
      icon: Video01Icon,
      link: '/tutorials'
    },
    {
      title: 'User Guide',
      description: 'Comprehensive documentation and help articles',
      icon: BookOpen01Icon,
      link: '#'
    },
    {
      title: 'Community Forum',
      description: 'Connect with other users and share tips',
      icon: CustomerSupportIcon,
      link: '#'
    }
  ];

  const filteredFaqs = selectedCategory === 'All' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  const searchedFaqs = filteredFaqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            How can we
            <span className="block text-primary">help you today?</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get the support you need to make the most of Stoodiora. Our team is here to help 
            you succeed with your photography business.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search01Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for help articles, features, or common questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Choose Your Support Channel
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {supportOptions.map((option, index) => (
              <div
                key={index}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                    <option.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {option.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {option.description}
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Availability:</span>
                        <span className="text-foreground font-medium">{option.availability}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Response Time:</span>
                        <span className="text-foreground font-medium">{option.response}</span>
                      </div>
                    </div>
                    <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                      {option.action}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Find quick answers to common questions about Stoodiora.
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {faqCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {searchedFaqs.map((faq, index) => (
              <details
                key={index}
                className="bg-card rounded-lg border border-border overflow-hidden group"
              >
                <summary className="p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground pr-4">
                      {faq.question}
                    </h3>
                    <ArrowRight01Icon className="w-5 h-5 text-muted-foreground group-open:rotate-90 transition-transform" />
                  </div>
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>

          {searchedFaqs.length === 0 && (
            <div className="text-center py-8">
              <QuestionIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                No FAQs found matching your search. Try different keywords or contact our support team.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Additional Resources
            </h2>
            <p className="text-lg text-muted-foreground">
              Explore more ways to learn and get the most out of Stoodiora.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {resources.map((resource, index) => (
              <Link
                key={index}
                to={resource.link}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow text-center group"
              >
                <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <resource.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {resource.title}
                </h3>
                <p className="text-muted-foreground">
                  {resource.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Still need help?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Our support team is always ready to assist you. Don't hesitate to reach out!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Contact Support
            </button>
            <Link
              to="/contact"
              className="bg-secondary text-secondary-foreground px-8 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Send us a Message
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SupportPage;