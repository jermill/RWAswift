/**
 * RWAswift Landing Page
 * Modern, premium B2B SaaS design
 */

import Link from 'next/link';
import { 
  ArrowRight,
  Check,
  Zap,
  Shield,
  Globe,
  Clock,
  Building2,
  FileCheck,
  Lock,
  BarChart3
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="font-semibold text-neutral-900 tracking-tight">RWAswift</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                Pricing
              </Link>
              <Link href="#" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                Documentation
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard" 
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Sign in
              </Link>
              <Link 
                href="/dashboard"
                className="text-sm font-medium px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-full mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-medium text-neutral-600">Now processing 50,000+ verifications monthly</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-semibold text-neutral-900 tracking-tight leading-[1.1] mb-6">
              KYC verification for
              <br />
              <span className="text-neutral-400">tokenized assets</span>
            </h1>
            
            <p className="text-lg text-neutral-600 leading-relaxed mb-8 max-w-xl">
              Complete investor verification in 2 minutes, not 2 weeks. 
              Built for RWA platforms that need compliance without the friction.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-neutral-900 text-sm font-medium rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
              >
                Talk to sales
              </Link>
            </div>

            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>GDPR compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>99.9% uptime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '2 min', label: 'Average verification time' },
              { value: '95%', label: 'Auto-approval rate' },
              { value: '50+', label: 'Countries supported' },
              { value: '$2M+', label: 'Compliance costs saved' },
            ].map((stat, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-semibold text-neutral-900 tracking-tight mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-neutral-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-4">
              Everything you need for RWA compliance
            </h2>
            <p className="text-neutral-600">
              Purpose-built for tokenization platforms. From identity verification to ongoing monitoring.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group p-6 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-neutral-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl font-semibold tracking-tight mb-4">
              How it works
            </h2>
            <p className="text-neutral-400">
              Integrate once, verify forever. Most teams are live within a day.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect your platform',
                description: 'Add our SDK or use our REST API. Full documentation and sandbox environment included.'
              },
              {
                step: '02',
                title: 'Configure your rules',
                description: 'Set jurisdiction requirements, risk thresholds, and approval workflows for your use case.'
              },
              {
                step: '03',
                title: 'Start verifying',
                description: 'Investors complete verification in 2 minutes. You get structured data and webhooks.'
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-neutral-800 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-4">
              Transparent pricing
            </h2>
            <p className="text-neutral-600">
              No hidden fees. No per-seat charges. Pay only for successful verifications.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, i) => (
              <div 
                key={i} 
                className={`p-8 rounded-2xl border ${
                  plan.featured 
                    ? 'bg-neutral-900 text-white border-neutral-900' 
                    : 'bg-white border-neutral-200'
                }`}
              >
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold mb-1 ${plan.featured ? '' : 'text-neutral-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${plan.featured ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {plan.description}
                  </p>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-semibold">{plan.price}</span>
                  {plan.period && (
                    <span className={`text-sm ${plan.featured ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        plan.featured ? 'text-emerald-400' : 'text-emerald-500'
                      }`} />
                      <span className={plan.featured ? 'text-neutral-300' : 'text-neutral-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard"
                  className={`block w-full py-3 text-center text-sm font-medium rounded-lg transition-colors ${
                    plan.featured
                      ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-neutral-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 tracking-tight mb-4">
            Ready to modernize your compliance?
          </h2>
          <p className="text-neutral-600 mb-8">
            Join the platforms processing millions in tokenized assets with RWAswift.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-neutral-900 text-sm font-medium rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
            >
              Schedule demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-neutral-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="font-semibold text-neutral-900 tracking-tight">RWAswift</span>
            </div>
            
            <div className="flex flex-wrap gap-8 text-sm text-neutral-500">
              <Link href="#" className="hover:text-neutral-900 transition-colors">Documentation</Link>
              <Link href="#" className="hover:text-neutral-900 transition-colors">API Reference</Link>
              <Link href="#" className="hover:text-neutral-900 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-neutral-900 transition-colors">Terms</Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-neutral-100 text-sm text-neutral-400">
            © 2025 RWAswift. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Clock,
    title: '2-minute verification',
    description: 'Investors complete identity verification in under 2 minutes with our optimized flow. No app downloads required.'
  },
  {
    icon: Shield,
    title: 'Enterprise security',
    description: 'SOC 2 Type II certified, GDPR compliant, with end-to-end encryption and regular penetration testing.'
  },
  {
    icon: Globe,
    title: 'Global coverage',
    description: 'Support for 50+ countries with automatic jurisdiction detection and local regulatory compliance.'
  },
  {
    icon: FileCheck,
    title: 'Document verification',
    description: 'AI-powered document authentication for passports, IDs, and proof of address from any country.'
  },
  {
    icon: BarChart3,
    title: 'Risk scoring',
    description: 'Intelligent risk assessment combining identity signals, behavioral data, and sanctions screening.'
  },
  {
    icon: Lock,
    title: 'Ongoing monitoring',
    description: 'Continuous AML monitoring with real-time alerts for sanctions hits and adverse media.'
  }
];

const pricingPlans = [
  {
    name: 'Starter',
    description: 'For early-stage platforms',
    price: '$2,000',
    period: '/month',
    features: [
      '100 verifications/month',
      '5 countries',
      'Standard API access',
      'Email support',
      'Basic dashboard'
    ],
    cta: 'Start free trial',
    featured: false
  },
  {
    name: 'Growth',
    description: 'For scaling platforms',
    price: '$10,000',
    period: '/month',
    features: [
      '1,000 verifications/month',
      '30 countries',
      'Advanced API + webhooks',
      'Priority support',
      'Custom risk rules',
      'Bulk verification'
    ],
    cta: 'Start free trial',
    featured: true
  },
  {
    name: 'Enterprise',
    description: 'For large operations',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited verifications',
      'All countries',
      'White-label option',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee'
    ],
    cta: 'Contact sales',
    featured: false
  }
];
