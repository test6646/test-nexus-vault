import React from 'react';
import { Link } from 'react-router-dom';
import { Mail01Icon, PhoneOff01Icon } from 'hugeicons-react';
import studiorraLogo from '../assets/Stoodiora-logo.svg';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="">
                <img src={studiorraLogo} alt="Stoodiora" className="w-[30vh] h-auto" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Professional Photography Studio Management System designed to streamline your photography business operations,
              from client management to financial tracking.
            </p>
            <div className="space-y-2">
              <a href="mailto:team.stoodiora@gmail.com" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail01Icon className="w-4 h-4" />
                <span>team.stoodiora@gmail.com</span>
              </a>
              <a href="tel:+919106403233" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <PhoneOff01Icon className="w-4 h-4" />
                <span>+91 91064 03233</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Features
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-muted-foreground text-sm">Event Management</span>
              </li>
              <li>
                <span className="text-muted-foreground text-sm">Client Tracking</span>
              </li>
              <li>
                <span className="text-muted-foreground text-sm">Financial Reports</span>
              </li>
              <li>
                <span className="text-muted-foreground text-sm">Invoice Generation</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-center text-muted-foreground text-sm">
            © {new Date().getFullYear()} Stoodiora. All rights reserved. <span className="text-primary font-medium">Powered by Prit Photo</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;