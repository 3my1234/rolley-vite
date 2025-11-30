'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency, formatDateTime, formatDate } from '../../../lib/utils';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Trophy, XCircle, Ban, Target } from 'lucide-react';
import { apiClient } from '../../../lib/api';

export default function HistoryPage() {
  const { getAccessToken } = usePrivy();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('transactions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else {
      fetchEventHistory();
    }
  }, [filter, activeTab]);

  const fetchTransactions = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      
      const transactions = await apiClient.getUserTransactions(token, filter !== 'all' ? filter : undefined) as any[];
      setTransactions(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventHistory = async () => {
    try {
      setLoading(true);
      
      // Try to get token with timeout
      let token: string | null = null;
      try {
        token = await Promise.race([
          getAccessToken(),
          new Promise<string | null>((_, reject) => 
            setTimeout(() => reject(new Error('Token timeout')), 5000)
          )
        ]) as string | null;
      } catch (tokenError) {
        console.warn('Failed to get access token:', tokenError);
        // Continue without token - API might still work with session cookies
      }
      
      // Call API with or without token
      const response = token 
        ? await apiClient.getUserHistory(token)
        : await apiClient.getUserHistory();
      
      console.log('Event history API response:', response);
      
      // getUserHistory now always returns { history: [], success: boolean }
      // But handle all possible response formats
      let history: any[] = [];
      if (Array.isArray(response)) {
        history = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.history)) {
          history = response.history;
        } else if (Array.isArray(response.data)) {
          history = response.data;
        } else if (Array.isArray((response as any).data?.history)) {
          history = (response as any).data.history;
        }
      }
      
      console.log('Parsed event history:', history);
      // Ensure it's always an array before setting
      setEventHistory(Array.isArray(history) ? history : []);
    } catch (error) {
      console.error('Error fetching event history:', error);
      // On error, ensure eventHistory is always an array
      setEventHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownToLine className="h-5 w-5 text-green-600" />;
      case 'WITHDRAWAL':
        return <ArrowUpFromLine className="h-5 w-5 text-red-600" />;
      case 'DAILY_ROLLOVER':
      case 'STAKE_PROFIT':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      default:
        return <TrendingUp className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-50';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50';
      case 'FAILED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-300 bg-slate-800/50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WON':
        return <Badge className="bg-green-600 text-white"><Trophy className="h-3 w-3 mr-1" /> Won</Badge>;
      case 'LOST':
        return <Badge className="bg-red-600 text-white"><XCircle className="h-3 w-3 mr-1" /> Lost</Badge>;
      case 'VOID':
        return <Badge className="bg-yellow-600 text-white"><Ban className="h-3 w-3 mr-1" /> Void</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">History</h1>
            <p className="text-gray-300">View your transactions and event history</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="events">Event History</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-end">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="DEPOSIT">Deposits</SelectItem>
                  <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                  <SelectItem value="DAILY_ROLLOVER">Rollovers</SelectItem>
                  <SelectItem value="STAKE_PROFIT">Stakes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No transactions found
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-slate-800/50 rounded-lg">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {tx.description || tx.type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(new Date(tx.createdAt))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {tx.type === 'DEPOSIT' || tx.type === 'DAILY_ROLLOVER' || tx.type === 'STAKE_PROFIT'
                        ? '+'
                        : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                    {tx.fee > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Fee: {formatCurrency(tx.fee)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event History</CardTitle>
                <CardDescription>
                  {eventHistory.length} completed event(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!eventHistory || !Array.isArray(eventHistory) || eventHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No completed events found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eventHistory.map((event: any) => (
                      <div
                        key={event.id}
                        className="p-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-white">
                                {formatDate(new Date(event.date))}
                              </h3>
                              {getStatusBadge(event.status)}
                            </div>
                            <p className="text-sm text-gray-400">
                              {event.sport.toUpperCase()} • {event.matches?.length || 0} match(es) • {event.totalOdds?.toFixed(4)}x odds
                            </p>
                          </div>
                        </div>

                        {event.matches && Array.isArray(event.matches) && event.matches.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {event.matches.slice(0, 3).map((match: any, idx: number) => (
                              <div key={idx} className="text-sm text-gray-300 pl-4 border-l-2 border-gray-700">
                                <div className="font-medium">
                                  {match.homeTeam} vs {match.awayTeam}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {match.prediction} • {match.odds}x
                                </div>
                              </div>
                            ))}
                            {event.matches.length > 3 && (
                              <div className="text-xs text-gray-500 pl-4">
                                +{event.matches.length - 3} more match(es)
                              </div>
                            )}
                          </div>
                        )}

                        {event.result && (
                          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 mb-1">Result Details:</div>
                            <div className="text-sm text-gray-300">{event.result}</div>
                          </div>
                        )}

                        <div className="mt-3 text-xs text-gray-500">
                          Completed: {formatDateTime(new Date(event.updatedAt || event.createdAt))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


