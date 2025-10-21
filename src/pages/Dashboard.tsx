'use client'

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import api from '../services/api';
import StatsCards from '../components/StatsCards';
import ExpiringPolicies from '../components/ExpiringPolicies';
import { Policy, Stats } from '../types';

const Dashboard: React.FC = () => {
  const [expiringPolicies, setExpiringPolicies] = useState<Policy[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPolicies: 0,
    expiringPolicies: 0,
    activeNotifications: 0,
    totalUsers: 0,
    renewalRate: 85 // Placeholder value
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get policies expiring in next 10 days
        const expiringResponse = await api.get('/policies/expiring/10');
        setExpiringPolicies(expiringResponse.data);

        // Get all policies count (placeholder for actual stats endpoint)
        const policiesResponse = await api.get('/policies');

        // Fetch renewal rate
        let renewalRate = 0
        try {
          const r = await api.get('/policies/_stats/renewal-rate')
          renewalRate = r.data.renewalRate || 0
        } catch (err) {
          console.warn('Failed to load renewal rate', err)
        }

        // Fetch notification stats
        let activeNotifications = 0
        try {
          const notifStatsResponse = await api.get('/notifications/stats')
          activeNotifications = notifStatsResponse.data.pending || 0
        } catch (err) {
          console.warn('Failed to load notification stats', err)
        }

        setStats({
          totalPolicies: policiesResponse.data.length,
          expiringPolicies: expiringResponse.data.length,
          activeNotifications,
          totalUsers: 8, // Placeholder
          renewalRate
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Painel de Controle</h1>
        <Link
          to="/upload"
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
        >
          <FileText size={16} className="mr-2" />
          Nova Apólice
        </Link>
      </div>

      {/* Stats cards */}
      <StatsCards stats={stats} />

      {/* Expiring policies */}
      <ExpiringPolicies expiringPolicies={expiringPolicies} />

    </div>
  );
};

export default Dashboard;