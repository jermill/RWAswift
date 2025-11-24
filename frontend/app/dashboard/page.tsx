/**
 * RWAswift Dashboard
 * Admin view for managing verifications
 */

'use client';

import { useState, useEffect } from 'react';
import { api, type VerificationResponse, type StatsResponse } from '@/lib/api';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp,
  Users,
  Activity,
  AlertCircle,
  Download
} from 'lucide-react';
import { formatDateTime, formatDuration, getRiskColor, getStatusColor } from '@/lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // Load API key from localStorage
    const storedKey = localStorage.getItem('rwaswift_api_key') || 'rwa_test_sk_1234567890abcdef';
    setApiKey(storedKey);
    loadData(storedKey);
  }, []);

  const loadData = async (key: string) => {
    try {
      const apiClient = new (await import('@/lib/api')).default(key);
      
      const [statsData, verificationsData] = await Promise.all([
        apiClient.getStats(),
        apiClient.listVerifications({ limit: 50 })
      ]);
      
      setStats(statsData);
      setVerifications(verificationsData.verifications);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor your KYC verifications</p>
            </div>
            <button
              onClick={() => loadData(apiKey)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="Total Verifications"
            value={stats?.stats.total || 0}
            color="blue"
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved"
            value={stats?.stats.approved || 0}
            subtext={stats?.stats.approvalRate ? `${stats.stats.approvalRate}% rate` : undefined}
            color="green"
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            value={stats?.stats.rejected || 0}
            color="red"
          />
          <StatCard
            icon={Clock}
            label="Avg Processing"
            value={stats?.stats.avgProcessingTime ? formatDuration(stats.stats.avgProcessingTime) : 'N/A'}
            color="purple"
          />
        </div>

        {/* Usage Stats */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Usage</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {stats.usage.monthly} / {stats.usage.limit} verifications
              </span>
              <span className="text-sm font-medium text-gray-900">
                {stats.usage.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-teal-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(stats.usage.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.usage.remaining} verifications remaining this month
            </p>
          </div>
        )}

        {/* Risk Distribution */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              <RiskCard label="Low Risk" count={stats.stats.riskDistribution.low} color="green" />
              <RiskCard label="Medium Risk" count={stats.stats.riskDistribution.medium} color="yellow" />
              <RiskCard label="High Risk" count={stats.stats.riskDistribution.high} color="red" />
            </div>
          </div>
        )}

        {/* Verifications Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Verifications</h3>
            <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processing Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {verifications.map((verification) => (
                  <tr key={verification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {verification.investorEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{verification.investorCountry || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(verification.status)}`}>
                        {verification.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          verification.riskScore < 30 ? 'text-green-600' :
                          verification.riskScore < 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {verification.riskScore}/100
                        </span>
                        {verification.riskLevel && (
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getRiskColor(verification.riskLevel)}`}>
                            {verification.riskLevel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {verification.processingTimeMs ? formatDuration(verification.processingTimeMs) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(verification.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {verifications.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No verifications yet</p>
              <p className="text-sm text-gray-500 mt-2">Start by creating your first verification</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color }: any) {
  const colors = {
    blue: 'from-blue-100 to-blue-50 text-blue-600',
    green: 'from-green-100 to-green-50 text-green-600',
    red: 'from-red-100 to-red-50 text-red-600',
    purple: 'from-purple-100 to-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

function RiskCard({ label, count, color }: any) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colors[color]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm mt-1">{label}</p>
    </div>
  );
}

