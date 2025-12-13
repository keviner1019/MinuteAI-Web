'use client';

import { useEffect, useState } from 'react';

interface ConnectionDiagnosticsProps {
  peerConnection: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
}

interface DiagnosticInfo {
  iceConnectionState: string;
  connectionState: string;
  signalingState: string;
  localTracks: { kind: string; enabled: boolean; readyState: string }[];
  remoteTracks: { kind: string; enabled: boolean; muted: boolean; readyState: string }[];
  stats: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    candidatePairType?: string;
  } | null;
}

export function ConnectionDiagnostics({
  peerConnection,
  localStream,
  remoteStream,
  isConnected,
}: ConnectionDiagnosticsProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!peerConnection) return;

    const updateDiagnostics = async () => {
      const info: DiagnosticInfo = {
        iceConnectionState: peerConnection.iceConnectionState,
        connectionState: peerConnection.connectionState,
        signalingState: peerConnection.signalingState,
        localTracks:
          localStream?.getTracks().map((track) => ({
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState,
          })) || [],
        remoteTracks:
          remoteStream?.getTracks().map((track) => ({
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          })) || [],
        stats: null,
      };

      // Get stats
      try {
        const stats = await peerConnection.getStats();
        let bytesReceived = 0;
        let bytesSent = 0;
        let packetsReceived = 0;
        let packetsSent = 0;
        let candidatePairType: string | undefined;

        stats.forEach((report: any) => {
          if (report.type === 'inbound-rtp') {
            bytesReceived += report.bytesReceived || 0;
            packetsReceived += report.packetsReceived || 0;
          } else if (report.type === 'outbound-rtp') {
            bytesSent += report.bytesSent || 0;
            packetsSent += report.packetsSent || 0;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            candidatePairType = `${report.localCandidateType || '?'} → ${report.remoteCandidateType || '?'}`;
          }
        });

        info.stats = {
          bytesReceived,
          bytesSent,
          packetsReceived,
          packetsSent,
          candidatePairType,
        };
      } catch (error) {
        console.error('Failed to get stats:', error);
      }

      setDiagnostics(info);
    };

    updateDiagnostics();
    const interval = setInterval(updateDiagnostics, 2000);

    return () => clearInterval(interval);
  }, [peerConnection, localStream, remoteStream]);

  if (!diagnostics) return null;

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStateColor = (state: string) => {
    if (state === 'connected' || state === 'completed' || state === 'stable' || state === 'live') {
      return 'text-green-600';
    }
    if (state === 'checking' || state === 'connecting' || state === 'have-local-offer') {
      return 'text-yellow-600';
    }
    if (state === 'failed' || state === 'closed' || state === 'disconnected') {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const hasMediaFlowStats = diagnostics.stats && diagnostics.stats.bytesReceived > 0;
  const hasRemoteAudio =
    diagnostics.remoteTracks.some(
      (t) => t.kind === 'audio' && !t.muted && t.readyState === 'live'
    ) || Boolean(remoteStream?.getAudioTracks().length);
  const mediaFlowOk = hasMediaFlowStats || hasRemoteAudio;

  const derivedConnectionState =
    isConnected && diagnostics.connectionState !== 'connected'
      ? 'connected (media)'
      : diagnostics.connectionState;
  const derivedIceState =
    isConnected &&
    diagnostics.iceConnectionState !== 'connected' &&
    diagnostics.iceConnectionState !== 'completed'
      ? `${diagnostics.iceConnectionState} (media live)`
      : diagnostics.iceConnectionState;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-2 rounded-lg shadow-lg font-medium transition-colors ${
          mediaFlowOk
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : diagnostics.iceConnectionState === 'checking' ||
              diagnostics.iceConnectionState === 'connecting'
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
        }`}
      >
        {mediaFlowOk ? '✅ Connected' : '⚠️ Connection Issues'}
      </button>

      {isExpanded && (
        <div className="mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-96 max-h-[600px] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">Connection Diagnostics</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Connection States */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">ICE Connection:</span>
              <span className={`text-sm font-bold ${getStateColor(derivedIceState)}`}>
                {derivedIceState}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Peer Connection:</span>
              <span className={`text-sm font-bold ${getStateColor(derivedConnectionState)}`}>
                {derivedConnectionState}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Signaling:</span>
              <span className={`text-sm font-bold ${getStateColor(diagnostics.signalingState)}`}>
                {diagnostics.signalingState}
              </span>
            </div>
          </div>

          {/* Media Flow Status */}
          {diagnostics.stats && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <h4 className="font-semibold text-sm mb-2">Media Flow</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Bytes Received:</span>
                  <span className="font-mono">{formatBytes(diagnostics.stats.bytesReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bytes Sent:</span>
                  <span className="font-mono">{formatBytes(diagnostics.stats.bytesSent)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Packets Received:</span>
                  <span className="font-mono">{diagnostics.stats.packetsReceived}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connection Type:</span>
                  <span className="font-mono text-xs">
                    {diagnostics.stats.candidatePairType || 'pending'}
                  </span>
                </div>
              </div>
              {mediaFlowOk ? (
                <div className="mt-2 text-xs text-green-600 font-medium">
                  ✅ Remote track detected — media should be audible.
                </div>
              ) : (
                <div className="mt-2 text-xs text-amber-600 font-medium">
                  ⚠️ Waiting for media packets...
                </div>
              )}
            </div>
          )}

          {/* Local Tracks */}
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2">Local Tracks</h4>
            {diagnostics.localTracks.length > 0 ? (
              <div className="space-y-1">
                {diagnostics.localTracks.map((track, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <span className={track.enabled ? 'text-green-600' : 'text-gray-400'}>
                      {track.kind === 'audio' ? '🎤' : '📹'}
                    </span>
                    <span className="capitalize">{track.kind}</span>
                    <span className={`text-xs ${getStateColor(track.readyState)}`}>
                      {track.readyState}
                    </span>
                    {!track.enabled && <span className="text-red-500 text-xs">(disabled)</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No local tracks</p>
            )}
          </div>

          {/* Remote Tracks */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Remote Tracks</h4>
            {diagnostics.remoteTracks.length > 0 ? (
              <div className="space-y-1">
                {diagnostics.remoteTracks.map((track, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <span className={track.enabled && !track.muted ? 'text-green-600' : 'text-gray-400'}>
                      {track.kind === 'audio' ? '🔊' : '📹'}
                    </span>
                    <span className="capitalize">{track.kind}</span>
                    <span className={`text-xs ${getStateColor(track.readyState)}`}>
                      {track.readyState}
                    </span>
                    {track.muted && (
                      <span className="text-red-500 text-xs font-medium">(MUTED - no media)</span>
                    )}
                    {!track.enabled && <span className="text-red-500 text-xs">(disabled)</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No remote tracks</p>
            )}
          </div>

          {/* Troubleshooting Tips */}
          {!mediaFlowOk && (
            <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
              <h4 className="font-semibold text-sm text-red-800 mb-2">Troubleshooting</h4>
              <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                <li>Check if both users granted microphone permission</li>
                <li>Ensure you&apos;re not behind a strict firewall</li>
                <li>Try refreshing the page</li>
                <li>Check your network connection</li>
                {diagnostics.iceConnectionState === 'failed' && (
                  <li className="font-bold">ICE connection failed - TURN server may be needed</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

