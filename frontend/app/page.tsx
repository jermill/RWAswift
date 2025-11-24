/**
 * RWAswift Landing Page
 * Hero + Features + Pricing + CTA
 */

import Link from 'next/link';
import { 
  CheckCircle2, 
  Zap, 
  Shield, 
  Clock, 
  DollarSign, 
  Globe,
  ArrowRight,
  Star
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
                RWAswift
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/docs" className="text-gray-600 hover:text-gray-900">
                Docs
              </Link>
              <Link 
                href="/dashboard"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full mb-6">
            <Star className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-600">
              2-minute KYC • 90% cheaper • 1-hour integration
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              Make RWA compliance
            </span>
            <br />
            <span className="text-gray-900">
              as fast as a Venmo payment
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Instant KYC verification for Real World Asset tokenization platforms.
            What takes 3-5 days now happens in 2 minutes. ⚡
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg text-lg font-semibold hover:shadow-xl transition-all inline-flex items-center justify-center"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-lg text-lg font-semibold hover:border-blue-500 transition-all"
            >
              View Documentation
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-8 text-sm text-gray-600">
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
              100 free verifications
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
              Cancel anytime
            </div>
          </div>
        </div>

        {/* Demo Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { label: 'Verification Time', value: '2 min', icon: Clock },
            { label: 'Cost Reduction', value: '90%', icon: DollarSign },
            { label: 'Countries', value: '50+', icon: Globe },
            { label: 'Approval Rate', value: '95%', icon: CheckCircle2 },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-teal-100 rounded-xl mb-3">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need for RWA compliance
            </h2>
            <p className="text-xl text-gray-600">
              Built specifically for tokenization platforms
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="p-8 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-teal-100 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.points.map((point, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free. Scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, idx) => (
              <div 
                key={idx} 
                className={`p-8 rounded-2xl ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-2xl scale-105' 
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-semibold mb-4">
                    ⭐ Most Popular
                  </div>
                )}
                <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? '' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className={`text-lg ${plan.popular ? 'text-white/80' : 'text-gray-600'}`}>
                    /month
                  </span>
                </div>
                <p className={`mb-6 ${plan.popular ? 'text-white/90' : 'text-gray-600'}`}>
                  {plan.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2 className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                        plan.popular ? 'text-white' : 'text-green-500'
                      }`} />
                      <span className={`text-sm ${plan.popular ? 'text-white' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className={`block w-full py-3 rounded-lg text-center font-semibold transition-all ${
                    plan.popular
                      ? 'bg-white text-blue-600 hover:bg-gray-50'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-teal-500 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to speed up your compliance?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join RWA platforms processing 10,000+ verifications per month
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:shadow-xl transition-all"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-6 h-6" />
                <span className="text-xl font-bold">RWAswift</span>
              </div>
              <p className="text-gray-400 text-sm">
                Make RWA compliance as fast as a Venmo payment
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#features">Features</Link></li>
                <li><Link href="#pricing">Pricing</Link></li>
                <li><Link href="/docs">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2024 RWAswift. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Zap,
    title: '2-Minute Verification',
    description: 'Instant KYC processing with real-time results',
    points: [
      'Auto-approval for 95% of legitimate investors',
      'Real-time status updates',
      'Webhook notifications',
      'No manual review delays'
    ]
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level compliance and data protection',
    points: [
      'SOC2 Type II certified',
      'GDPR & CCPA compliant',
      'End-to-end encryption',
      'Regular security audits'
    ]
  },
  {
    icon: Globe,
    title: 'Global Coverage',
    description: 'Support for 50+ countries with local regulations',
    points: [
      'Automatic jurisdiction detection',
      'Country-specific risk rules',
      'Multi-language support',
      'PEP & sanctions screening'
    ]
  }
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$2,000',
    description: 'Perfect for early-stage RWA platforms',
    features: [
      '100 verifications/month',
      '5 countries supported',
      'Basic API access',
      'Email support',
      'Dashboard access'
    ],
    cta: 'Start Free Trial',
    popular: false
  },
  {
    name: 'Growth',
    price: '$10,000',
    description: 'For growing tokenization platforms',
    features: [
      '1,000 verifications/month',
      '30 countries supported',
      'Advanced API features',
      'Priority support',
      'Custom risk rules',
      'Webhook notifications',
      'Bulk verification'
    ],
    cta: 'Get Started',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large-scale operations',
    features: [
      'Unlimited verifications',
      '50+ countries supported',
      'White-label option',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantees',
      'On-premise deployment'
    ],
    cta: 'Contact Sales',
    popular: false
  }
];
