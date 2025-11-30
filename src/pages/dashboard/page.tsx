import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { 
  Wallet, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Target,
  ArrowUpRight,
  Award,
  Plus,
  Activity,
  Coins,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { formatCurrency, formatDate } from '../../lib/utils';
import { apiClient } from '../../lib/api';

export default function DashboardPage() {
  const { getAccessToken, user: privyUser } = usePrivy();
  const { privyToken, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [stakes, setStakes] = useState<any[]>([]);
  const [dailyEvent, setDailyEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createStakeOpen, setCreateStakeOpen] = useState(false);
  const [stakeForm, setStakeForm] = useState({
    amount: '0.1', // ROL amount (0.1 ROL = $10)
    currency: 'ROL', // Only ROL staking supported
    period: 'THIRTY_DAYS',
  });
  const [tokenBalance, setTokenBalance] = useState({
    rolBalance: 0,
    pendingRewards: 0,
    totalEarned: 0,
  });

  useEffect(() => {
    // Wait for auth to finish loading and token to be available
    if (authLoading) {
      return;
    }

    const fetchDataIfReady = async () => {
      if (!privyToken) {
        // Try to get token directly from Privy if AuthContext doesn't have it
        try {
          const token = await getAccessToken();
          if (token) {
            syncUserAndFetchData(token);
          } else {
            setLoading(false);
          }
        } catch {
          setLoading(false);
        }
        return;
      }

      syncUserAndFetchData(privyToken);
    };

    fetchDataIfReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privyToken, authLoading]);

  const syncUserAndFetchData = async (token: string) => {
    try {
      await fetchData(token);
    } catch (error) {
      console.error('Fetch error:', error);
      setLoading(false);
    }
  };

  const fetchData = async (token: string) => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }

      const [user, stakesResult, dailyEventResult] = await Promise.all([
        apiClient.getUserProfile(token).catch(err => {
          console.error('Error fetching user profile:', err);
          return null;
        }),
        apiClient.getUserStakes(token).catch(err => {
          console.error('Error fetching stakes:', err);
          return { stakes: [] };
        }),
        apiClient.getCurrentEvents(token).catch(err => {
          console.error('Error fetching daily events:', err);
          return { dailyEvent: null, activeStakes: [] };
        }),
      ]);

      // Extract dailyEvent from the response object
      const dailyEvent = (dailyEventResult as any)?.dailyEvent || null;

      // Handle stakes response - it might be wrapped in { stakes: [...] }
      const stakesArray = Array.isArray(stakesResult) 
        ? stakesResult 
        : (stakesResult as any)?.stakes || [];

      setUser(user);
      setStakes(stakesArray);
      setDailyEvent(dailyEvent);

      // Fetch token balance (only if user was fetched successfully)
      if (user && typeof user === 'object' && 'id' in user) {
        try {
          const tokenBalance = await apiClient.getUserTokens(token);
          setTokenBalance({
            rolBalance: (tokenBalance as any)?.rolBalance || 0,
            pendingRewards: (tokenBalance as any)?.pendingRewards || 0,
            totalEarned: (tokenBalance as any)?.totalEarned || 0,
          });
        } catch (tokenError) {
          console.error('Error fetching token balance:', tokenError);
          // Set defaults if token balance fetch fails
          setTokenBalance({
            rolBalance: 0,
            pendingRewards: 0,
            totalEarned: 0,
          });
        }
      } else {
        // Set defaults if user is null
        setTokenBalance({
          rolBalance: 0,
          pendingRewards: 0,
          totalEarned: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStake = async () => {
    try {
      const token = privyToken || await getAccessToken();
      if (token) {
        await apiClient.createStake(stakeForm, token);
        setCreateStakeOpen(false);
        const currentToken = privyToken || await getAccessToken();
        if (currentToken) {
          fetchData(currentToken);
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create stake');
    }
  };

  const activeStakes = stakes.filter(s => s.status === 'ACTIVE');
  const totalStaked = activeStakes.reduce((sum, s) => sum + (s.currentAmount || 0), 0); // ROL amount
  const totalProfit = totalStaked - activeStakes.reduce((sum, s) => sum + (s.initialAmount || 0), 0); // ROL profit

  const calculateTotalOdds = (matches: any[]) => {
    return matches.reduce((acc: number, match: any) => {
      const odds =
        typeof match?.odds === 'number'
          ? match.odds
          : typeof match?.predictedOdds === 'number'
            ? match.predictedOdds
            : 1;
      return acc * odds;
    }, 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Dashboard
            </h1>
            <p className="text-zinc-500">
              {privyUser?.email?.address || 'Welcome back'}
            </p>
          </div>
          <Button
            onClick={() => setCreateStakeOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Stake
          </Button>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'ROL Balance',
              value: `${(user?.rolBalance || 0).toFixed(4)} ROL`,
              icon: Coins,
              subtitle: `≈ $${((user?.rolBalance || 0) * 100).toFixed(2)} USD`,
              change: '+12.5%'
            },
            {
              title: 'Total Balance',
              value: formatCurrency((user?.usdBalance || 0) + (user?.usdtBalance || 0), 'USD'),
              icon: Wallet,
              subtitle: 'USD + USDT',
              change: '+12.5%'
            },
            {
              title: 'Active Stakes',
              value: activeStakes.length.toString(),
              icon: TrendingUp,
              subtitle: `${totalStaked.toFixed(4)} ROL`
            },
            {
              title: 'Total Profit',
              value: `${totalProfit.toFixed(4)} ROL`,
              icon: DollarSign,
              subtitle: `≈ $${(totalProfit * 100).toFixed(2)} USD`,
              change: `+${totalStaked > 0 ? ((totalProfit / totalStaked) * 100).toFixed(1) : 0}%`
            },
            {
              title: 'Win Rate',
              value: '94.2%',
              icon: Award,
              subtitle: 'Last 30 days'
            }
          ].map((stat, index) => (
            <Card key={index} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className="h-5 w-5 text-zinc-500" />
                  {stat.change && (
                    <span className="text-xs text-emerald-500 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {stat.change}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-zinc-500">{stat.subtitle || stat.title}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ROL Token Balance */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              ROL Token Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-zinc-500 text-sm mb-1">Available Balance</div>
                <div className="text-2xl font-bold text-white">
                  {tokenBalance.rolBalance.toLocaleString()} ROL
                </div>
                <div className="text-sm text-zinc-500 mt-1">
                  ≈ ${(tokenBalance.rolBalance * 100).toFixed(2)} USD
                </div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-zinc-500 text-sm mb-1">Pending Rewards</div>
                <div className="text-2xl font-bold text-emerald-500">
                  {tokenBalance.pendingRewards.toLocaleString()} ROL
                </div>
                <div className="text-sm text-zinc-500 mt-1">
                  ≈ ${(tokenBalance.pendingRewards * 100).toFixed(2)} USD
                </div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="text-zinc-500 text-sm mb-1">Total Earned</div>
                <div className="text-2xl font-bold text-yellow-500">
                  {tokenBalance.totalEarned.toLocaleString()} ROL
                </div>
                <div className="text-sm text-zinc-500 mt-1">
                  ≈ ${(tokenBalance.totalEarned * 100).toFixed(2)} USD
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-zinc-300">
                <strong className="text-emerald-500">Earn ROL rewards</strong> automatically when you complete stakes. 
                Higher stake amounts and longer periods earn more rewards.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI-Analyzed Matches */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">AI-Analysed Matches</CardTitle>
                <CardDescription className="text-zinc-500">
                  {dailyEvent ? formatDate(new Date(dailyEvent.date)) : 'No active matches'}
                </CardDescription>
              </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-500 text-sm font-medium">
                    {(() => {
                      const publishedMatches =
                        (dailyEvent?.adminPredictions && dailyEvent.adminPredictions.length
                          ? dailyEvent.adminPredictions
                          : dailyEvent?.matches) || [];
                      return publishedMatches.length
                        ? calculateTotalOdds(publishedMatches).toFixed(4)
                        : dailyEvent?.totalOdds
                          ? dailyEvent.totalOdds.toFixed(4)
                          : '1.0500';
                    })()}
                    x Odds
                  </span>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {dailyEvent && dailyEvent.status === 'PENDING' && dailyEvent.matches && dailyEvent.matches.length > 0 ? (
              <div className="space-y-4">
                {dailyEvent.matches.map((match: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-4">
                      {/* Match Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700">
                              <span className="text-zinc-400 text-xs font-medium uppercase">{match.sport || 'Football'}</span>
                            </div>
                            <div className="text-zinc-500 text-sm">Today</div>
                          </div>
                          <div className="text-lg font-bold text-white mb-1">
                            {match.homeTeam} vs {match.awayTeam}
                          </div>
                          <div className="text-emerald-500 font-medium">
                            {match.prediction} · {match.odds}x odds
                          </div>
                        </div>
                      </div>

                      {/* AI vs Admin Predictions */}
                      <div className="space-y-3">
                        {/* AI Analysis */}
                        <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-white font-medium text-sm">AI Analysis</h4>
                            <span className="px-2 py-1 bg-blue-900/30 border border-blue-600/30 rounded text-xs text-blue-400">
                              AI Generated
                            </span>
                          </div>
                          <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{match.reasoning}</p>
                          
                          {/* Show data source badge if using real statistics */}
                          {match.stats?.stats_source === 'football_data_org' && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-900/30 border border-green-600/30 rounded text-xs text-green-400">
                                ✅ Real Statistics
                              </span>
                              {match.stats?.home_form?.form_string && (
                                <span className="text-xs text-zinc-500">
                                  Form: {match.stats.home_form.form_string} / {match.stats.away_form?.form_string || 'N/A'}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {match.bookmakerMarket && (
                            <div className="mt-2 text-xs text-zinc-500">
                              Market: {match.bookmakerMarket}
                            </div>
                          )}
                        </div>

                        {/* Admin Review (if available) */}
                        {dailyEvent?.adminPredictions && dailyEvent.adminPredictions[idx] && (
                          <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-600/30">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-white font-medium text-sm">Admin Review</h4>
                              <span className="px-2 py-1 bg-emerald-900/30 border border-emerald-600/30 rounded text-xs text-emerald-400">
                                Admin Verified
                              </span>
                            </div>
                            <p className="text-zinc-300 text-sm leading-relaxed">
                              {dailyEvent.adminPredictions[idx].reasoning || match.reasoning}
                            </p>
                            {dailyEvent.adminPredictions[idx].bookmakerMarket && (
                              <div className="mt-2 text-xs text-emerald-400">
                                Verified Market: {dailyEvent.adminPredictions[idx].bookmakerMarket}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Disclaimer */}
                        <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-600/30">
                          <div className="flex items-start gap-2">
                            <div className="text-yellow-400 mt-0.5">⚠️</div>
                            <div className="text-xs text-yellow-200">
                              <strong>Disclaimer:</strong> These predictions are AI-generated and may not be available on all bookmakers. 
                              Check with your preferred bookmaker for exact odds and market availability.
                            </div>
                          </div>
                        </div>

                        {/* Admin Comments (if available) */}
                        {dailyEvent?.adminComments && (
                          <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-600/30">
                            <div className="text-xs text-blue-400 font-medium mb-1">Admin Notes</div>
                            <div className="text-white text-sm">{dailyEvent.adminComments}</div>
                          </div>
                        )}
                      </div>

                      {/* Team Stats */}
                      {(match.researchData || match.homeForm || match.awayForm) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                            <div className="text-xs text-zinc-500 font-medium mb-1">{match.homeTeam} Form</div>
                            <div className="text-white text-sm font-mono">{match.researchData?.homeForm || match.homeForm || 'N/A'}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                            <div className="text-xs text-zinc-500 font-medium mb-1">{match.awayTeam} Form</div>
                            <div className="text-white text-sm font-mono">{match.researchData?.awayForm || match.awayForm || 'N/A'}</div>
                          </div>
                        </div>
                      )}

                      {/* Additional Match Details */}
                      {(match.injuries || match.h2h || match.researchData?.injuries) && (
                        <div className="space-y-2">
                          {match.injuries && (
                            <div className="p-3 rounded-lg bg-red-900/20 border border-red-600/30">
                              <div className="text-xs text-red-400 font-medium mb-1">⚠️ Injuries</div>
                              <div className="text-white text-sm">{match.injuries}</div>
                            </div>
                          )}
                          {match.h2h && (
                            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-600/30">
                              <div className="text-xs text-blue-400 font-medium mb-1">📊 Head-to-Head</div>
                              <div className="text-white text-sm">{match.h2h}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Data Source */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <span className="text-xs text-zinc-600">Data source: {match.researchData?.dataSource || 'AI Analysis'}</span>
                        <a
                          href="https://www.sofascore.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
                        >
                          Verify on SofaScore
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                  <p className="text-sm text-zinc-400 mb-3">
                    AI has analyzed these matches for optimal safety. Create a stake to participate in today&apos;s event.
                  </p>
                  <Button
                    onClick={() => setCreateStakeOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Create Stake to Participate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-zinc-600" />
                </div>
                {dailyEvent && dailyEvent.status !== 'PENDING' ? (
                  <div className="text-center py-8">
                    <p className="text-zinc-400 mb-2">This event has been completed.</p>
                    <p className="text-sm text-zinc-500 mb-4">
                      Status: {dailyEvent.status === 'WON' ? '✅ Won' : dailyEvent.status === 'LOST' ? '❌ Lost' : '⚪ Void'}
                    </p>
                    {dailyEvent.result && (
                      <div className="p-4 bg-zinc-800 rounded-lg text-left max-w-2xl mx-auto">
                        <p className="text-sm text-zinc-300">{dailyEvent.result}</p>
                      </div>
                    )}
                    <p className="text-zinc-500 mt-4">Check your history to view all completed events.</p>
                  </div>
                ) : (
                  <p className="text-zinc-500">No matches available today</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Stakes */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Your Active Stakes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeStakes.length > 0 ? (
              <div className="space-y-3">
                {activeStakes.map((stake: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-white font-medium">{formatCurrency(stake.currentValue, stake.currency)}</div>
                        <div className="text-sm text-zinc-500">{stake.period.replace(/_/g, ' ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-500 font-medium">
                          +{formatCurrency(stake.currentValue - stake.initialAmount, stake.currency)}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {stake.daysCompleted}/{stake.totalDays} days
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(stake.daysCompleted / stake.totalDays) * 100}%` }}
                      />
                    </div>
                    {stake.pendingRolReward > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-yellow-500">
                        <Coins className="h-4 w-4" />
                        <span>Pending: {stake.pendingRolReward.toLocaleString()} ROL</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Target className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-zinc-500 mb-4">No active stakes yet</p>
                <Button
                  onClick={() => setCreateStakeOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Create Your First Stake
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Stake Dialog */}
      <Dialog open={createStakeOpen} onOpenChange={setCreateStakeOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Create New Stake</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Stake ROL tokens to start earning. Choose amount and period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">ROL Amount</Label>
              <input
                type="number"
                step="0.01"
                value={stakeForm.amount}
                onChange={(e) => setStakeForm({ ...stakeForm, amount: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-emerald-500"
                placeholder="Enter ROL amount"
              />
              <p className="text-xs text-zinc-400 mt-1">
                ≈ ${(Number(stakeForm.amount) * 100).toFixed(2)} USD (1 ROL = $100)
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Available: {tokenBalance.rolBalance.toFixed(4)} ROL
              </p>
            </div>

            <div className="hidden">
              <Label className="text-white mb-2 block">Currency</Label>
              <Select value={stakeForm.currency} onValueChange={(value) => setStakeForm({ ...stakeForm, currency: value })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="ROL">ROL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white mb-2 block">Staking Period</Label>
              <Select value={stakeForm.period} onValueChange={(value) => setStakeForm({ ...stakeForm, period: value })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="THIRTY_DAYS">30 Days</SelectItem>
                  <SelectItem value="SIXTY_DAYS">60 Days</SelectItem>
                  <SelectItem value="ONE_EIGHTY_DAYS">180 Days</SelectItem>
                  <SelectItem value="THREE_SIXTY_FIVE_DAYS">365 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-zinc-300">
                You&apos;ll earn additional <strong className="text-emerald-500">ROL tokens</strong> when this stake completes successfully.
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Staking period determines your reward rate. Longer periods = more rewards!
              </p>
            </div>

            <Button
              onClick={handleCreateStake}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Create Stake
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
