'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatDate, formatDateTime } from '../../../lib/utils';
import { Trophy, XCircle, Ban, Target, Calendar } from 'lucide-react';
import { apiClient } from '../../../lib/api';

export default function AdminHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAdminHistory(100) as any;
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const calculateTotalOdds = (matches: any[]) => {
    return matches.reduce((acc, match) => {
      const value = typeof match.odds === 'number' ? match.odds : typeof match.predictedOdds === 'number' ? match.predictedOdds : 1;
      return acc * value;
    }, 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Event History</h1>
          <p className="text-gray-300">View all completed events and their results</p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Completed Events</CardTitle>
            <CardDescription className="text-gray-400">
              {history.length} event(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No completed events found
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((event: any) => (
                  <div
                    key={event.id}
                    className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <h3 className="text-xl font-semibold text-white">
                            {formatDate(new Date(event.date))}
                          </h3>
                          {getStatusBadge(event.status)}
                          <Badge variant="outline" className="text-gray-400 border-gray-600">
                            {event.sport.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
                          <span>{event.matches?.length || 0} match(es)</span>
                          <span>•</span>
                          <span>{event.totalOdds ? event.totalOdds.toFixed(4) : calculateTotalOdds(event.matches || []).toFixed(4)}x odds</span>
                          <span>•</span>
                          <span>Published: {formatDateTime(new Date(event.updatedAt || event.createdAt))}</span>
                        </div>
                      </div>
                    </div>

                    {event.matches && event.matches.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-sm font-medium text-gray-400 mb-2">Matches:</div>
                        {event.matches.map((match: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gray-900/50 rounded border border-gray-700">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-white">
                                  {match.homeTeam} vs {match.awayTeam}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">
                                  {match.prediction} • {match.odds || match.predictedOdds || 'N/A'}x odds
                                </div>
                                {match.reasoning && (
                                  <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                                    {match.reasoning}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {event.result && (
                      <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
                        <div className="text-sm font-medium text-gray-400 mb-2">Result Details:</div>
                        <div className="text-sm text-gray-300 whitespace-pre-line">{event.result}</div>
                      </div>
                    )}

                    {event.adminComments && (
                      <div className="mt-3 p-3 bg-blue-900/20 rounded border border-blue-700/30">
                        <div className="text-xs text-blue-400 mb-1">Admin Comments:</div>
                        <div className="text-sm text-blue-200">{event.adminComments}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

