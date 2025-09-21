import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar01Icon, 
  UserIcon, 
  ArrowRight01Icon, 
  Camera01Icon,
  DollarCircleIcon,
  Task01Icon,
  StartUp01Icon,
  ChartBarLineIcon,
  BulbIcon
} from 'hugeicons-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const BlogPage = () => {
  const categories = [
    { name: 'Business Tips', icon: StartUp01Icon, count: 12 },
    { name: 'Photography', icon: Camera01Icon, count: 8 },
    { name: 'Pricing Strategies', icon: DollarCircleIcon, count: 6 },
    { name: 'Workflow Tips', icon: Task01Icon, count: 10 },
    { name: 'Industry Trends', icon: ChartBarLineIcon, count: 5 }
  ];

  const featuredArticles = [
    {
      title: '10 Essential Business Tips for Photography Studios in 2024',
      excerpt: 'Discover proven strategies to grow your photography business, from client acquisition to pricing optimization.',
      category: 'Business Tips',
      readTime: '8 min read',
      date: 'March 15, 2024',
      author: 'Stoodiora Team',
      image: '/api/placeholder/400/250'
    },
    {
      title: 'How to Price Your Photography Services Competitively',
      excerpt: 'Learn the art of pricing your services to maximize profits while remaining competitive in your market.',
      category: 'Pricing Strategies',
      readTime: '6 min read',
      date: 'March 12, 2024',
      author: 'Preet Suthar',
      image: '/api/placeholder/400/250'
    },
    {
      title: 'Streamlining Your Wedding Photography Workflow',
      excerpt: 'From initial client contact to final delivery, optimize every step of your wedding photography process.',
      category: 'Workflow Tips',
      readTime: '10 min read',
      date: 'March 10, 2024',
      author: 'Industry Expert',
      image: '/api/placeholder/400/250'
    }
  ];

  const resources = [
    {
      title: 'Photography Business Checklist',
      description: 'Complete checklist for starting and running a successful photography business.',
      type: 'PDF Guide',
      icon: StartUp01Icon
    },
    {
      title: 'Client Onboarding Templates',
      description: 'Ready-to-use templates for seamless client onboarding and communication.',
      type: 'Templates',
      icon: UserIcon
    },
    {
      title: 'Pricing Calculator',
      description: 'Interactive tool to help you calculate competitive pricing for your services.',
      type: 'Calculator',
      icon: DollarCircleIcon
    },
    {
      title: 'Wedding Shot List Template',
      description: 'Comprehensive shot list to ensure you never miss important moments.',
      type: 'Template',
      icon: Camera01Icon
    }
  ];

  const recentArticles = [
    {
      title: 'Managing Multiple Photography Projects Simultaneously',
      category: 'Workflow Tips',
      date: 'March 8, 2024',
      readTime: '5 min read'
    },
    {
      title: 'Building Long-term Client Relationships in Photography',
      category: 'Business Tips',
      date: 'March 5, 2024',
      readTime: '7 min read'
    },
    {
      title: 'The Future of Photography: Trends to Watch in 2024',
      category: 'Industry Trends',
      date: 'March 3, 2024',
      readTime: '9 min read'
    },
    {
      title: 'Equipment ROI: When to Upgrade Your Photography Gear',
      category: 'Business Tips',
      date: 'March 1, 2024',
      readTime: '6 min read'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Photography Business
            <span className="block text-primary">Resources & Insights</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Expert advice, industry insights, and practical resources to help you grow 
            your photography and videography business.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((category, index) => (
              <button
                key={index}
                className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow text-left group"
              >
                <category.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-foreground mb-1">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.count} articles</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            Featured Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredArticles.map((article, index) => (
              <article
                key={index}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Camera01Icon className="w-12 h-12 text-primary" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {article.category}
                    </span>
                    <span>{article.readTime}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <UserIcon className="w-4 h-4" />
                      <span>{article.author}</span>
                    </div>
                    <button className="text-primary hover:text-primary/80 transition-colors">
                      <ArrowRight01Icon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Free Resources & Tools
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Download our free resources to streamline your business operations and 
              improve your photography workflow.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((resource, index) => (
              <div
                key={index}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <resource.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {resource.title}
                      </h3>
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                        {resource.type}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {resource.description}
                    </p>
                    <button className="text-primary font-medium hover:text-primary/80 transition-colors flex items-center space-x-2">
                      <span>Download Free</span>
                      <ArrowRight01Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Articles */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-8">Recent Articles</h2>
          <div className="space-y-6">
            {recentArticles.map((article, index) => (
              <article
                key={index}
                className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {article.category}
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar01Icon className="w-4 h-4" />
                        <span>{article.date}</span>
                      </span>
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                  <button className="text-primary hover:text-primary/80 transition-colors">
                    <ArrowRight01Icon className="w-5 h-5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8">
            <BulbIcon className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Stay Updated with Industry Insights
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Get weekly tips, trends, and resources delivered to your inbox. 
              No spam, just valuable content for photography professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogPage;