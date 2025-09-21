import React, { useState } from 'react';
import { Mail01Icon, CallIcon, WhatsappIcon, CheckmarkCircle02Icon } from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    plan: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [open, setOpen] = useState(false);
const [selected, setSelected] = useState("");


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('https://formcarry.com/s/RyJ9A_WJ88s', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          plan: '',
          message: ''
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Get Started with
            <span className="block text-primary">Stoodiora</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Ready to transform your photography business? Contact us to get started or ask any questions.
          </p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Send us a Message
              </h2>
              
              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-success font-medium">
                    Thank you for your message! We'll get back to you within 24 hours.
                  </p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive font-medium">
                    There was an error sending your message. Please try again.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="+91 91064 03233"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                      Studio/Company Name
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                      placeholder="Your studio name"
                    />
                  </div>
                </div>

                <div className="w-full">
  <label className="block text-sm font-medium text-foreground mb-2">
    Interested Plan
  </label>

  <div className="relative">
    <div
      onClick={() => setOpen(!open)}
      className="flex items-center justify-between w-full px-3 py-2 border border-input rounded-md bg-background text-foreground cursor-pointer select-none"
    >
      <span>
        {selected
          ? options.find((o) => o.value === selected)?.label
          : "Select a plan"}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 transition-transform ${
          open ? "rotate-180" : ""
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>

    {open && (
      <div className="absolute mt-1 w-full border border-input rounded-md bg-background shadow-lg z-50">
        <div
          onClick={() => {
            setSelected("starter")
            setOpen(false)
          }}
          className="px-3 py-2 hover:bg-muted cursor-pointer"
        >
          Monthly (₹799/month)
        </div>
        <div
          onClick={() => {
            setSelected("professional")
            setOpen(false)
          }}
          className="px-3 py-2 hover:bg-muted cursor-pointer"
        >
          Yearly (₹8,199/year)
        </div>
      </div>
    )}
  </div>
</div>


                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="Tell us about your studio and specific requirements..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Get in Touch
              </h2>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail01Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email Support</h3>
                    <p className="text-muted-foreground">team.stoodiora@gmail.com</p>
                    <p className="text-sm text-muted-foreground">We typically respond within 2-4 hours</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <CallIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Phone Support</h3>
                    <p className="text-muted-foreground">+91 91064 03233</p>
                    <p className="text-sm text-muted-foreground">Monday - Friday, 9:00 AM - 6:00 PM IST</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <WhatsappIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">WhatsApp</h3>
                    <p className="text-muted-foreground">+91 91064 03233</p>
                    <p className="text-sm text-muted-foreground">Quick responses for urgent queries</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-4">Why Choose Stoodiora?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center space-x-2">
                    <CheckmarkCircle02Icon className="w-4 h-4 text-primary" />
                    <span>3-day free trial, no credit card required</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckmarkCircle02Icon className="w-4 h-4 text-primary" />
                    <span>Dedicated onboarding and training</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckmarkCircle02Icon className="w-4 h-4 text-primary" />
                    <span>24/7 support for all customers</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckmarkCircle02Icon className="w-4 h-4 text-primary" />
                    <span>Data migration assistance included</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;