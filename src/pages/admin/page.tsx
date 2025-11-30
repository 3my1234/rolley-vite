'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, TrendingUp, DollarSign, Activity, Plus, Calendar, CheckCircle, Trophy, History } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { apiClient } from '../../lib/api';

interface AdminStats {
  stats: {
    totalUsers: number;
    activeStakes: number;
    totalDeposits: number;
    totalWithdrawals: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    user: {
      email: string | null;
      firstName: string | null;
    };
  }>;
  recentStakes: Array<{
    id: string;
    period: string;
    daysCompleted: number;
    totalDays: number;
    currentAmount: number;
    totalProfit: number;
    currency: string;
    user: {
      email: string | null;
      firstName: string | null;
    };
  }>;
}

interface TopStaker {
  rank: number;
  stakesCount: number;
  totalStakedRol: number;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    totalReferrals?: number;
  } | null;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topStakers, setTopStakers] = useState<TopStaker[]>([]);
  const [topStakersLoading, setTopStakersLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchTopStakers();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await apiClient.getAdminStats();
      setStats(data as AdminStats);
      setError('');
    } catch (error: unknown) {
      console.error('Error fetching stats:', error);
      const message =
        (error as Error)?.message || 'Failed to load admin dashboard';
      if (/unauthorized|forbidden/i.test(message)) {
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopStakers = async () => {
    try {
      setTopStakersLoading(true);
      const data = await apiClient.getAdminTopStakers(10);
      const nextTopStakers = Array.isArray((data as any)?.topStakers)
        ? (data as any).topStakers
        : [];
      setTopStakers(nextTopStakers);
    } catch (err) {
      console.error('Error fetching top stakers:', err);
      const message = (err as Error)?.message || '';
      if (/unauthorized|forbidden/i.test(message)) {
        navigate('/admin/login', { replace: true });
        return;
      }
      setTopStakers([]);
    } finally {
      setTopStakersLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-200">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md bg-red-500/10 border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-200">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-purple-200">Platform overview and management</p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-6">
        <button
        onClick={() => navigate('/admin/create-event')}
          className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all hover:scale-105 hover:shadow-2xl text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-8 h-8" />
                <h3 className="text-2xl font-bold">Create Daily Event</h3>
              </div>
              <p className="text-green-100 text-sm">
                Manually enter matches - AI generates reasoning
              </p>
            </div>
            <Plus className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        <button
        onClick={() => navigate('/admin/review')}
          className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 transition-all hover:scale-105 hover:shadow-2xl text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-8 h-8" />
                <h3 className="text-2xl font-bold">Review Matches</h3>
              </div>
              <p className="text-orange-100 text-sm">
                Review and refine AI predictions
              </p>
            </div>
            <CheckCircle className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        <button
        onClick={() => navigate('/admin/users')}
          className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-105 hover:shadow-2xl text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8" />
                <h3 className="text-2xl font-bold">Manage Users</h3>
              </div>
              <p className="text-blue-100 text-sm">
                View and manage all platform users
              </p>
            </div>
            <Activity className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        <button
        onClick={() => navigate('/admin/history')}
          className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all hover:scale-105 hover:shadow-2xl text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <History className="w-8 h-8" />
                <h3 className="text-2xl font-bold">Event History</h3>
              </div>
              <p className="text-purple-100 text-sm">
                View completed events and results
              </p>
            </div>
            <History className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Total Users</CardTitle>
            <Users className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.stats.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Active Stakes</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.stats.activeStakes || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Total Deposits</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(stats?.stats.totalDeposits || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">Total Withdrawals</CardTitle>
            <Activity className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(stats?.stats.totalWithdrawals || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Stakers */}
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Top Stakers
              </CardTitle>
              <CardDescription className="text-purple-200">
                Users ranked by total stakes placed
              </CardDescription>
            </div>
            <button
              onClick={() => fetchTopStakers()}
              className="text-sm text-purple-300 hover:text-white transition-colors"
              disabled={topStakersLoading}
            >
              {topStakersLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {topStakersLoading ? (
            <p className="text-purple-200 text-sm">Loading top stakers...</p>
          ) : topStakers.length === 0 ? (
            <p className="text-purple-200 text-sm">No staking activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead>
                  <tr className="text-left text-xs uppercase text-purple-300 tracking-wider">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Stakes</th>
                    <th className="px-4 py-3">Total ROL</th>
                    <th className="px-4 py-3">Approx. USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-white/80">
                  {topStakers.map((staker) => {
                    const userName = staker.user
                      ? [staker.user.firstName, staker.user.lastName]
                          .filter(Boolean)
                          .join(' ') || staker.user.email || 'Unknown user'
                      : 'Unknown user';
                    const rolAmount = staker.totalStakedRol ?? 0;
                    const usdAmount = rolAmount * 100;
                    return (
                      <tr key={`${staker.rank}-${staker.user?.id || staker.rank}`}>
                        <td className="px-4 py-3 font-semibold text-yellow-300">
                          #{staker.rank}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span>{userName}</span>
                            {staker.user?.email && (
                              <span className="text-xs text-purple-200/60">
                                {staker.user.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{staker.stakesCount}</td>
                        <td className="px-4 py-3">{rolAmount.toFixed(2)} ROL</td>
                        <td className="px-4 py-3">
                          {formatCurrency(usdAmount, 'USD')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
          <CardDescription className="text-purple-200">Latest platform transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <div className="font-medium text-white">
                      {tx.user.email || tx.user.firstName || 'User'}
                    </div>
                    <div className="text-sm text-purple-300">
                      {tx.type} - {formatDateTime(new Date(tx.createdAt))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className={`text-sm ${
                      tx.status === 'COMPLETED' ? 'text-green-400' : 
                      tx.status === 'PENDING' ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {tx.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-purple-300 text-center py-4">No recent transactions</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Stakes */}
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Recent Stakes</CardTitle>
          <CardDescription className="text-purple-200">Latest user stakes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentStakes && stats.recentStakes.length > 0 ? (
              stats.recentStakes.map((stake) => (
                <div
                  key={stake.id}
                  className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <div className="font-medium text-white">
                      {stake.user.email || stake.user.firstName || 'User'}
                    </div>
                    <div className="text-sm text-purple-300">
                      {stake.period.replace(/_/g, ' ')} - Day {stake.daysCompleted}/{stake.totalDays}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">
                      {formatCurrency(stake.currentAmount, stake.currency)}
                    </div>
                    <div className="text-sm text-green-400">
                      +{formatCurrency(stake.totalProfit)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-purple-300 text-center py-4">No recent stakes</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
