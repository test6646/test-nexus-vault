import React from 'react';
import { Dollar01Icon, ChartBarLineIcon, Invoice01Icon, CreditCardIcon, ChartColumnIcon, Calculator01Icon,  } from 'hugeicons-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import financialTracking from '../../assets/financial-tracking.jpg';

const FinanceFeaturesPage = () => {
  const financeFeatures = [
    {
      title: 'Comprehensive Financial Dashboard',
      description: 'Real-time overview of your financial health with income, expenses, profit margins, and cash flow visualization.',
      icon: Dollar01Icon,
      image: financialTracking,
      benefits: [
        'Real-time financial overview',
        'Income vs expense tracking',
        'Profit margin analysis',
        'Cash flow visualization'
      ]
    },
    {
      title: 'Advanced Financial Analytics',
      description: 'Detailed insights into revenue trends, seasonal patterns, and business performance with predictive analytics.',
      icon: ChartBarLineIcon,
      image: financialTracking,
      benefits: [
        'Revenue trend analysis',
        'Seasonal pattern recognition',
        'Predictive forecasting',
        'Performance benchmarking'
      ]
    },
    {
      title: 'Professional Invoice Management',
      description: 'Create, send, and track professional invoices with automated reminders and multiple payment options.',
      icon: Invoice01Icon,
      image: financialTracking,
      benefits: [
        'Professional invoice design',
        'Automated payment reminders',
        'Multiple payment gateways',
        'Invoice tracking & status'
      ]
    },
    {
      title: 'Payment Processing Integration',
      description: 'Seamless integration with popular payment gateways including UPI, bank transfers, and online payments.',
      icon: CreditCardIcon,
      image: financialTracking,
      benefits: [
        'Multiple payment methods',
        'UPI & bank integration',
        'Secure payment processing',
        'Automated reconciliation'
      ]
    },
    {
      title: 'Detailed Financial Reports',
      description: 'Generate comprehensive financial reports including P&L statements, balance sheets, and tax-ready summaries.',
      icon: ChartColumnIcon,
      image: financialTracking,
      benefits: [
        'P&L statements',
        'Balance sheet reports',
        'Tax-ready summaries',
        'Custom report generation'
      ]
    },
    {
      title: 'Expense Management & Categorization',
      description: 'Track and categorize all business expenses with receipt management and automatic tax calculations.',
      icon: Calculator01Icon,
      image: financialTracking,
      benefits: [
        'Expense categorization',
        'Receipt management',
        'Tax calculation automation',
        'Vendor expense tracking'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Financial Management
            <span className="block text-primary">Made Easy</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Take control of your studio's finances with comprehensive tracking, reporting, and analytics tools.
          </p>
        </div>
      </section>

      {/* Features Zigzag Layout */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {financeFeatures.map((feature, index) => (
            <div
              key={index}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 ${
                index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
              }`}
            >
              <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground">
                    {feature.title}
                  </h2>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={`${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                <div className="relative">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="rounded-xl shadow-2xl w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Master Your Studio Finances
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join successful photography studios using Stoodiora to manage their financial operations efficiently.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </a>
            <a
              href="/pricing"
              className="bg-secondary text-secondary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:bg-accent transition-colors"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FinanceFeaturesPage;