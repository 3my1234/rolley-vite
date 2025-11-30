'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { CheckCircle, AlertTriangle, Clock, Target, Trash2, RotateCcw, Trophy, XCircle, Ban, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api';

interface Match {
  homeTeam: string | null;
  awayTeam: string | null;
  tournament?: string | null;
  prediction?: string | null;
  odds?: number | null;
  predictedOdds?: number | null;
  reasoning?: string | null;
  predictionMarket?: string | null;
  confidence?: number | null;
  bookmakerMarket?: string | null;
  homeForm?: string | null;
  awayForm?: string | null;
  injuries?: string | null;
  h2h?: string | null;
  modelWarnings?: string[] | null;
  autoSelected?: boolean;
  metadata?: Record<string, unknown> | null;
}

interface DailyEvent {
  result?: string | null;
  id: string;
  date: string;
  sport: string;
  matches: Match[];
  totalOdds?: number | null;
  status: string;
  aiPredictions: Match[];
  adminPredictions?: Match[];
  adminComments?: string;
  adminReviewed: boolean;
  createdAt: string;
  updatedAt?: string;
  autoSelectionTotalOdds?: number | null;
  autoSelectionCount?: number | null;
}

export default function AdminReviewPage() {
  const [events, setEvents] = useState<DailyEvent[]>([]);
  const [publishedEvents, setPublishedEvents] = useState<DailyEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DailyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [adminPredictions, setAdminPredictions] = useState<Match[]>([]);
  const [resultStatus, setResultStatus] = useState<string>('');
  const [resultDetails, setResultDetails] = useState('');
  const [updatingResult, setUpdatingResult] = useState(false);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const skipAutoSaveRef = useRef(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const generateDailyPicks = async () => {
    setGenerating(true);
    try {
      // Step 1: Fetch picks directly from Football AI service (frontend can access it)
      console.log('🌐 Fetching picks from Football AI service...');
      const footballAiResponse = await fetch('https://f4c4o880s8go0co48kkwsw00.useguidr.com/safe-picks/today');
      
      if (!footballAiResponse.ok) {
        throw new Error(`Football AI service returned ${footballAiResponse.status}`);
      }
      
      const safePicks = await footballAiResponse.json();
      console.log('✅ Got picks from Football AI:', safePicks);
      
      if (!safePicks.picks || safePicks.picks.length === 0) {
        alert(`⚠️ No picks found for today. Reason: ${safePicks.reason || 'Unknown'}`);
        setGenerating(false);
        return;
      }
      
      // Step 2: Send to backend to save (backend can't reach Football AI, but can receive data)
      console.log('📤 Sending picks to backend to save...');
      const result = await apiClient.generateDailyPicks(safePicks);
      console.log('✅ Backend saved picks:', result);
      
      // Refresh events after generating
      await fetchEvents();
      
      // Check if result has success flag or eventId (both indicate success)
      const resultData = result as any;
      if (resultData?.success || resultData?.data?.eventId || resultData?.eventId) {
        const eventId = resultData?.data?.eventId || resultData?.eventId;
        const matchCount = resultData?.data?.matches || safePicks.picks.length;
        alert(`✅ Daily picks generated successfully! ${matchCount} match(es) saved for review. Event ID: ${eventId}`);
      } else if (resultData?.error || resultData?.message) {
        alert(`⚠️ Picks fetched but save failed: ${resultData.message || resultData.error || 'Unknown error'}`);
      } else {
        // If no error message, assume success if we got a response
        alert(`✅ Daily picks generated! Check the review dashboard.`);
      }
    } catch (error: any) {
      console.error('Error generating daily picks:', error);
      alert(`❌ Error: ${error.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const data = await apiClient.getAdminPendingEvents();
      const pending =
        (Array.isArray((data as any)?.pending) && (data as any).pending) ||
        (Array.isArray((data as any)?.events) && (data as any).events) ||
        (Array.isArray(data) ? data : []);
      const published =
        (Array.isArray((data as any)?.published) && (data as any).published) ||
        [];

      // Filter published events to only show PENDING status (exclude completed events)
      const activePublished = published.filter((event: DailyEvent) => 
        event.status === 'PENDING' || !event.status
      );

      setEvents(pending);
      setPublishedEvents(activePublished);

      // If currently selected event moved to published, keep it selected
      if (selectedEvent) {
        const updated =
          pending.find((event: DailyEvent) => event.id === selectedEvent.id) ||
          published.find((event: DailyEvent) => event.id === selectedEvent.id);
        if (updated) {
          skipAutoSaveRef.current = true;
          setSelectedEvent(updated);
          const base =
            updated.adminPredictions && updated.adminPredictions.length
              ? updated.adminPredictions
              : getAiSelectionMatches(updated);
          setAdminPredictions(base.map((match: Match) => ({ ...match })));
          setAdminComments(updated.adminComments || '');
          setTimeout(() => {
            skipAutoSaveRef.current = false;
          }, 0);
        } else {
          setSelectedEvent(null);
          setAdminPredictions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      setPublishedEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const selectEvent = (event: DailyEvent) => {
    skipAutoSaveRef.current = true;
    setSelectedEvent(event);
    setAdminComments(event.adminComments || '');
    setResultStatus(event.status || 'PENDING');
    setResultDetails(event.result || '');
    const base =
      event.adminPredictions && event.adminPredictions.length
        ? event.adminPredictions
        : getAiSelectionMatches(event);
    setAdminPredictions(base.map((match: Match) => ({ ...match })));
    setTimeout(() => {
      skipAutoSaveRef.current = false;
    }, 0);
  };

  const updateMatchPrediction = (index: number, field: keyof Match, value: string | number) => {
    const updated = [...adminPredictions];
    const next = { ...updated[index], [field]: value };
    if (field === 'odds') {
      const numeric = typeof value === 'number' ? value : parseFloat(value as string);
      if (!Number.isNaN(numeric)) {
        next.predictedOdds = Number(numeric.toFixed(4));
        next.odds = Number(numeric.toFixed(4));
      }
    }
    updated[index] = next;
    setAdminPredictions(updated);
  };

  const removeMatch = (index: number) => {
    if (adminPredictions.length <= 1) return;
    setAdminPredictions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetToAiPredictions = () => {
    if (!selectedEvent) return;
    const base =
      selectedEvent.adminPredictions && selectedEvent.adminPredictions.length
        ? selectedEvent.adminPredictions
        : getAiSelectionMatches(selectedEvent);
    setAdminPredictions((base || []).map((match: Match) => ({ ...match })));
  };

  const normalizePredictions = (matches: Match[]): Match[] => {
    return matches
      .filter((match) => match && match.homeTeam && match.awayTeam)
      .map((match) => {
        const oddsValue =
          typeof match.odds === 'number'
            ? match.odds
            : typeof match.predictedOdds === 'number'
              ? match.predictedOdds
              : null;
        const safeOdds =
          typeof oddsValue === 'number' && Number.isFinite(oddsValue)
            ? Number(oddsValue.toFixed(4))
            : null;

        return {
          ...match,
          odds:
            safeOdds ??
            (typeof match.odds === 'number'
              ? Number(match.odds.toFixed?.(4) ?? match.odds)
              : null),
          predictedOdds:
            safeOdds ??
            (typeof match.predictedOdds === 'number'
              ? Number(match.predictedOdds.toFixed?.(4) ?? match.predictedOdds)
              : null),
        };
      });
  };

  const saveReview = async (approved: boolean = false) => {
    if (!selectedEvent) return;

    setSaving(true);
    try {
      const normalizedPredictions = normalizePredictions(adminPredictions);

      await apiClient.reviewAdminEvent({
        eventId: selectedEvent.id,
        adminPredictions: normalizedPredictions,
        adminComments,
        approved,
      });

      await fetchEvents();
      setSelectedEvent(null);
      setAdminComments('');
      setAdminPredictions([]);
    } catch (error) {
      console.error('Error saving review:', error);
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalOdds = (matches: Match[]) => {
    return matches.reduce((acc, match) => {
      const value =
        typeof match.odds === 'number'
          ? match.odds
          : typeof match.predictedOdds === 'number'
            ? match.predictedOdds
            : 1;
      return acc * value;
    }, 1);
  };

  const getAiSelectionMatches = (event: DailyEvent): Match[] => {
    if (!event?.matches?.length) {
      return [];
    }
    const autoSelectedMatches = event.matches.filter((match) => match.autoSelected);
    if (autoSelectedMatches.length) {
      return autoSelectedMatches;
    }
    if (Array.isArray(event.aiPredictions) && event.aiPredictions.length) {
      const aiAuto = event.aiPredictions.filter((match) => match.autoSelected);
      if (aiAuto.length) {
        return aiAuto;
      }
    }
    return event.matches;
  };

  const getAiTotalOdds = (event: DailyEvent): number => {
    const matches = getAiSelectionMatches(event);
    return matches.length ? calculateTotalOdds(matches) : event.totalOdds ?? 1;
  };

  const getAiMatchCount = (event: DailyEvent): number => {
    const matches = getAiSelectionMatches(event);
    return matches.length || event.matches.length || 0;
  };

  const getCurrentMatches = (event: DailyEvent): Match[] => {
    if (selectedEvent?.id === event.id && adminPredictions.length) {
      return adminPredictions;
    }
    if (event.adminPredictions?.length) {
      return event.adminPredictions;
    }
    return getAiSelectionMatches(event);
  };

  const getCurrentTotalOdds = (event: DailyEvent): number => {
    const matches = getCurrentMatches(event);
    return matches.length ? calculateTotalOdds(matches) : getAiTotalOdds(event);
  };

  const getCurrentMatchCount = (event: DailyEvent): number => {
    const matches = getCurrentMatches(event);
    return matches.length || getAiMatchCount(event);
  };

  useEffect(() => {
    skipAutoSaveRef.current = false;
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    if (skipAutoSaveRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      const normalizedPredictions = normalizePredictions(adminPredictions);
      try {
        await apiClient.reviewAdminEvent({
          eventId: selectedEvent.id,
          adminPredictions: normalizedPredictions,
          adminComments,
          approved: false,
        });
        setEvents((prev) =>
          prev.map((event) =>
            event.id === selectedEvent.id
              ? {
                  ...event,
                  adminPredictions: normalizedPredictions,
                  totalOdds: calculateTotalOdds(normalizedPredictions),
                }
              : event,
          ),
        );
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 700);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPredictions, adminComments, selectedEvent?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => navigate('/admin')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Admin Review Dashboard</h1>
          <p className="text-gray-400">Review and refine AI predictions before they go live</p>
        </div>

        {/* Always show Generate button at the top */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <Button 
                onClick={generateDailyPicks}
                disabled={generating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                size="lg"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                    Generating...
                  </>
                ) : (
                  '🎯 Generate Today\'s AI Picks'
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                Fetch today's AI picks and save them for review. This will create a new event for today.
              </p>
            </div>
          </CardContent>
        </Card>

        {events.length === 0 && publishedEvents.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-gray-400 mb-6">No events pending admin review. Use the button above to generate today's picks.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Events List */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Pending Review ({events.length})</h2>
              <div className="space-y-4 mb-8">
                {events.map((event: DailyEvent) => {
                  const currentTotal = getCurrentTotalOdds(event);
                  const currentMatchCount = getCurrentMatchCount(event);
                  const originalTotal = getAiTotalOdds(event);
                  const originalMatchCount = getAiMatchCount(event);
                  const showOriginalHint =
                    Math.abs(currentTotal - originalTotal) > 0.0001 ||
                    currentMatchCount !== originalMatchCount;

                  return (
                  <Card 
                    key={event.id} 
                    className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:border-blue-500 ${
                      selectedEvent?.id === event.id ? 'border-blue-500' : ''
                    }`}
                    onClick={() => selectEvent(event)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {new Date(event.date).toLocaleDateString()}
                        </CardTitle>
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Review
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Sport:</span>
                          <span className="text-sm font-medium">{event.sport}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Current Total:</span>
                          <span className="text-sm font-medium">
                            {currentTotal.toFixed(4)}x
                          </span>
                        </div>
                        {event.adminPredictions?.length ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Admin Draft Total:</span>
                            <span className="text-sm font-medium">
                              {calculateTotalOdds(event.adminPredictions).toFixed(4)}x
                            </span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Current Matches:</span>
                          <span className="text-sm font-medium">{currentMatchCount}</span>
                        </div>
                        {event.adminPredictions?.length ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Admin Draft Matches:</span>
                            <span className="text-sm font-medium">{event.adminPredictions.length}</span>
                          </div>
                        ) : null}
                        {showOriginalHint && (
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Original AI Auto:</span>
                            <span>
                              {originalTotal.toFixed(4)}x ({originalMatchCount})
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Created:</span>
                          <span className="text-sm font-medium">
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>

              <h2 className="text-xl font-semibold mb-4 mt-10">Published (Last {publishedEvents.length})</h2>
              <div className="space-y-4">
                {publishedEvents.map((event: DailyEvent) => (
                  <Card
                    key={event.id}
                    className={`bg-gray-900 border-green-600/40 cursor-pointer transition-all hover:border-green-400 ${
                      selectedEvent?.id === event.id ? 'border-green-400' : ''
                    }`}
                    onClick={() => selectEvent(event)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2 text-green-300">
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                          <Badge variant="outline" className="text-green-300 border-green-500">
                            Live
                          </Badge>
                        </CardTitle>
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          Updated {new Date(event.updatedAt || event.createdAt).toLocaleTimeString()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Sport:</span>
                          <span className="text-sm font-medium text-green-200">{event.sport}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Published Total:</span>
                          <span className="text-sm font-medium text-green-200">
                            {calculateTotalOdds(event.matches).toFixed(4)}x
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Matches:</span>
                          <span className="text-sm font-medium text-green-200">{event.matches.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Last Updated:</span>
                          <span className="text-sm font-medium text-green-200">
                            {new Date(event.updatedAt || event.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Review Panel */}
            {selectedEvent && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Review Event</h2>
                
                {/* AI vs Admin Comparison */}
                <Card className="bg-gray-800 border-gray-700 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      AI Predictions vs Admin Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>AI Disclaimer:</strong> These predictions are AI-generated and may not be available on all bookmakers. 
                        Please review and refine as needed.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      {adminPredictions.map((match: Match, index: number) => (
                        <div key={index} className="border border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <button
                                type="button"
                                onClick={() => removeMatch(index)}
                                disabled={adminPredictions.length <= 1}
                                className="text-red-300 hover:text-red-100 disabled:text-red-900/40 transition-colors mb-2 inline-flex items-center gap-2"
                                title={adminPredictions.length <= 1 ? 'At least one match required' : 'Remove match from draft'}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-400">Match</label>
                                  <div className="text-sm font-medium">
                                    {match.homeTeam} vs {match.awayTeam}
                                  </div>
                                  <div className="text-xs text-gray-500">{match.tournament}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-400">Prediction</label>
                                  <input
                                    type="text"
                                    value={match.prediction ?? ''}
                                    onChange={(e) => updateMatchPrediction(index, 'prediction', e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                    placeholder="e.g., Home Win, Over 2.5 Goals"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-400">Odds</label>
                              <input
                                type="number"
                                step="0.01"
                                min="1.01"
                                max="2"
                                value={
                                  typeof match.odds === 'number'
                                    ? match.odds
                                    : match.predictedOdds ?? ''
                                }
                                onChange={(e) => updateMatchPrediction(index, 'odds', parseFloat(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                placeholder="1.03"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-400">Bookmaker Market</label>
                              <input
                                type="text"
                                value={match.bookmakerMarket ?? ''}
                                onChange={(e) => updateMatchPrediction(index, 'bookmakerMarket', e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                placeholder="Match Result, Over/Under, etc."
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-400">Reasoning</label>
                              <textarea
                                value={match.reasoning ?? ''}
                                onChange={(e) => updateMatchPrediction(index, 'reasoning', e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                                rows={2}
                                placeholder="Why this is safe..."
                              />
                            </div>
                          </div>

                          <div className="mt-3 space-y-2 text-xs text-gray-400">
                            {match.homeForm && <div><strong>Home form:</strong> {match.homeForm}</div>}
                            {match.awayForm && <div><strong>Away form:</strong> {match.awayForm}</div>}
                            {match.injuries && <div><strong>Injuries:</strong> {match.injuries}</div>}
                            {match.h2h && <div><strong>Head-to-head:</strong> {match.h2h}</div>}
                            {Array.isArray(match.modelWarnings) && match.modelWarnings.length ? (
                              <div className="text-yellow-300">
                                <strong>Warnings:</strong> {match.modelWarnings.join(' | ')}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">New Total Odds:</span>
                        <span className="text-lg font-bold text-blue-400">
                          {calculateTotalOdds(adminPredictions).toFixed(4)}x
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Admin Comments */}
                <Card className="bg-gray-800 border-gray-700 mb-6">
                  <CardHeader>
                    <CardTitle>Admin Comments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={adminComments}
                      onChange={(e) => setAdminComments(e.target.value)}
                      placeholder="Add your comments about these predictions, bookmaker availability, or improvements..."
                      className="bg-gray-700 border-gray-600"
                      rows={4}
                    />
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={resetToAiPredictions}
                    variant="outline"
                    className="border-blue-400/40 text-blue-200 hover:text-white hover:bg-blue-500/20"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to AI Picks
                  </Button>
                  <Button
                    onClick={() => saveReview(false)}
                    disabled={saving}
                    variant="outline"
                    className="flex-1 border-white/20 text-white bg-white/5 hover:bg-white/10"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Save Review Only
                  </Button>
                  <Button
                    onClick={() => saveReview(true)}
                    disabled={saving}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Publish
                  </Button>
                </div>

                {/* Result Tracking Section - Only show if event is published */}
                {selectedEvent.adminReviewed && (
                  <Card className="bg-gray-800 border-gray-700 mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Match Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-400 mb-2 block">
                            Current Status
                          </label>
                          <div className="flex items-center gap-2 mb-4">
                            {selectedEvent.status === 'WON' && (
                              <Badge className="bg-green-600 text-white">
                                <Trophy className="h-3 w-3 mr-1" />
                                Won
                              </Badge>
                            )}
                            {selectedEvent.status === 'LOST' && (
                              <Badge className="bg-red-600 text-white">
                                <XCircle className="h-3 w-3 mr-1" />
                                Lost
                              </Badge>
                            )}
                            {selectedEvent.status === 'VOID' && (
                              <Badge className="bg-yellow-600 text-white">
                                <Ban className="h-3 w-3 mr-1" />
                                Void
                              </Badge>
                            )}
                            {(selectedEvent.status === 'PENDING' || !selectedEvent.status) && (
                              <Badge className="bg-gray-600 text-white">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-400 mb-2 block">
                            Update Result Status
                          </label>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <Button
                              type="button"
                              onClick={() => setResultStatus('WON')}
                              variant={resultStatus === 'WON' ? 'default' : 'outline'}
                              className={resultStatus === 'WON' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              <Trophy className="h-4 w-4 mr-2" />
                              Won
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setResultStatus('LOST')}
                              variant={resultStatus === 'LOST' ? 'default' : 'outline'}
                              className={resultStatus === 'LOST' ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Lost
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setResultStatus('VOID')}
                              variant={resultStatus === 'VOID' ? 'default' : 'outline'}
                              className={resultStatus === 'VOID' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Void
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-400 mb-2 block">
                            Result Details (Optional)
                          </label>
                          <Textarea
                            value={resultDetails}
                            onChange={(e) => setResultDetails(e.target.value)}
                            placeholder="e.g., Match finished 2-1. All predictions correct. Over 0.5 goals won, home team scored 2 goals..."
                            className="bg-gray-700 border-gray-600"
                            rows={3}
                          />
                        </div>

                        <Button
                          onClick={async () => {
                            if (!selectedEvent) return;
                            setUpdatingResult(true);
                            try {
                              await apiClient.updateEventResult(
                                selectedEvent.id,
                                resultStatus,
                                resultDetails || undefined
                              );
                              alert(`✅ Result updated to: ${resultStatus}`);
                              
                              // Refresh events list (this will filter out completed events)
                              await fetchEvents();
                              
                              // If event is now completed (WON/LOST/VOID), deselect it
                              if (resultStatus !== 'PENDING') {
                                setSelectedEvent(null);
                                setAdminPredictions([]);
                                setAdminComments('');
                                setResultStatus('');
                                setResultDetails('');
                              } else {
                                // Refresh selected event if still pending
                                const updated = await apiClient.getAdminPendingEvents() as any;
                                const found = [...(updated?.pending || []), ...(updated?.published || [])].find(
                                  (e: DailyEvent) => e.id === selectedEvent.id
                                );
                                if (found) {
                                  selectEvent(found);
                                }
                              }
                            } catch (error: any) {
                              console.error('Error updating result:', error);
                              alert(`❌ Error: ${error.message || 'Failed to update result'}`);
                            } finally {
                              setUpdatingResult(false);
                            }
                          }}
                          disabled={updatingResult || resultStatus === selectedEvent.status}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {updatingResult ? 'Updating...' : 'Update Result'}
                        </Button>

                        {selectedEvent.result && (
                          <div className="p-3 bg-gray-700/50 rounded-lg">
                            <div className="text-xs text-gray-400 mb-1">Previous Result Details:</div>
                            <div className="text-sm text-gray-300">{selectedEvent.result}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
