// Hook for managing WebRTC peer connections lifecycle
// Based on MEETING_MODULE_RECONSTRUCTION_PLAN.md

import { useEffect, useCallback, useRef } from 'react';
import { useMeetingStore } from '@/lib/store/meeting-store';
import type { PeerConnectionState } from '@/types/meeting';

export interface ConnectionStats {
  participantId: string;
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  roundTripTime: number;
  jitter: number;
  availableBandwidth: number;
}

export interface UsePeerConnectionsReturn {
  // Connection state
  peerConnections: Map<string, PeerConnectionState>;
  connectedPeers: string[];
  connectingPeers: string[];
  disconnectedPeers: string[];
  
  // Connection stats
  getConnectionStats: (participantId: string) => Promise<ConnectionStats | null>;
  getAllConnectionStats: () => Promise<Map<string, ConnectionStats>>;
  
  // Connection management
  reconnectPeer: (participantId: string) => Promise<void>;
  closePeerConnection: (participantId: string) => void;
  
  // Connection health
  getConnectionQuality: (participantId: string) => 'excellent' | 'good' | 'poor' | 'unknown';
  isConnectionHealthy: (participantId: string) => boolean;
  
  // Utilities
  totalConnections: number;
  activeConnections: number;
}

export function usePeerConnections(): UsePeerConnectionsReturn {
  const store = useMeetingStore();
  const peerConnections = store.peerConnections;
  const { updatePeerConnection, closePeerConnection: storeClosePeerConnection } = store.actions;
  
  // Stats tracking
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStatsRef = useRef<Map<string, ConnectionStats>>(new Map());
  
  const STATS_INTERVAL = 2000; // 2 seconds
  const RECONNECTION_TIMEOUT = 5000; // 5 seconds
  
  // ==============================================
  // COMPUTED VALUES
  // ==============================================
  
  const connectedPeers = Array.from(peerConnections.entries())
    .filter(([_, state]) => state.connectionState === 'connected')
    .map(([participantId]) => participantId);
  
  const connectingPeers = Array.from(peerConnections.entries())
    .filter(([_, state]) => 
      state.connectionState === 'connecting' || 
      state.connectionState === 'new'
    )
    .map(([participantId]) => participantId);
  
  const disconnectedPeers = Array.from(peerConnections.entries())
    .filter(([_, state]) => 
      state.connectionState === 'disconnected' || 
      state.connectionState === 'failed'
    )
    .map(([participantId]) => participantId);
  
  const totalConnections = peerConnections.size;
  const activeConnections = connectedPeers.length;
  
  // ==============================================
  // CONNECTION STATS
  // ==============================================
  
  const getConnectionStats = useCallback(
    async (participantId: string): Promise<ConnectionStats | null> => {
      const peerState = peerConnections.get(participantId);
      if (!peerState) {
        return null;
      }
      
      try {
        // In real implementation, this would get stats from PeerConnection
        // For now, return cached stats
        return connectionStatsRef.current.get(participantId) || null;
      } catch (error) {
        console.error(`Failed to get stats for ${participantId}:`, error);
        return null;
      }
    },
    [peerConnections]
  );
  
  const getAllConnectionStats = useCallback(
    async (): Promise<Map<string, ConnectionStats>> => {
      const allStats = new Map<string, ConnectionStats>();
      
      for (const participantId of peerConnections.keys()) {
        const stats = await getConnectionStats(participantId);
        if (stats) {
          allStats.set(participantId, stats);
        }
      }
      
      return allStats;
    },
    [peerConnections, getConnectionStats]
  );
  
  // ==============================================
  // CONNECTION MANAGEMENT
  // ==============================================
  
  const reconnectPeer = useCallback(
    async (participantId: string): Promise<void> => {
      console.log(`🔄 Reconnecting to ${participantId}...`);
      
      const peerState = peerConnections.get(participantId);
      if (!peerState) {
        console.warn(`⚠️ No peer connection found for ${participantId}`);
        return;
      }
      
      try {
        // Update state to reconnecting
        updatePeerConnection(participantId, {
          connectionState: 'connecting',
        });
        
        // In real implementation, this would trigger ICE restart
        // via PeerManager.getConnection(participantId).attemptIceRestart()
        
        // Wait for reconnection or timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Reconnection timeout'));
          }, RECONNECTION_TIMEOUT);
          
          // Watch for connection state change
          const checkConnection = setInterval(() => {
            const currentState = peerConnections.get(participantId);
            if (currentState?.connectionState === 'connected') {
              clearTimeout(timeout);
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);
        });
        
        console.log(`✅ Reconnected to ${participantId}`);
      } catch (error) {
        console.error(`❌ Failed to reconnect to ${participantId}:`, error);
        
        updatePeerConnection(participantId, {
          connectionState: 'failed',
        });
        
        throw error;
      }
    },
    [peerConnections, updatePeerConnection]
  );
  
  const closePeerConnection = useCallback(
    (participantId: string): void => {
      console.log(`🔌 Closing connection to ${participantId}`);
      
      // In real implementation, this would call PeerManager.closeConnection()
      storeClosePeerConnection(participantId);
      connectionStatsRef.current.delete(participantId);
    },
    [storeClosePeerConnection]
  );
  
  // ==============================================
  // CONNECTION HEALTH
  // ==============================================
  
  const getConnectionQuality = useCallback(
    (participantId: string): 'excellent' | 'good' | 'poor' | 'unknown' => {
      const stats = connectionStatsRef.current.get(participantId);
      if (!stats) return 'unknown';
      
      // Simple quality heuristic based on RTT and packet loss
      const rtt = stats.roundTripTime;
      const packetLoss = stats.packetsLost;
      
      if (rtt < 100 && packetLoss < 1) {
        return 'excellent';
      } else if (rtt < 300 && packetLoss < 3) {
        return 'good';
      } else {
        return 'poor';
      }
    },
    []
  );
  
  const isConnectionHealthy = useCallback(
    (participantId: string): boolean => {
      const quality = getConnectionQuality(participantId);
      return quality === 'excellent' || quality === 'good';
    },
    [getConnectionQuality]
  );
  
  // ==============================================
  // AUTO RECONNECTION
  // ==============================================
  
  useEffect(() => {
    // Monitor disconnected peers and attempt reconnection
    const checkConnections = setInterval(() => {
      disconnectedPeers.forEach((participantId) => {
        const peerState = peerConnections.get(participantId);
        
        if (peerState && peerState.connectionState === 'disconnected') {
          console.log(`🔄 Auto-reconnecting to ${participantId}...`);
          reconnectPeer(participantId).catch((error) => {
            console.error(`Failed to auto-reconnect to ${participantId}:`, error);
          });
        }
      });
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkConnections);
  }, [disconnectedPeers, peerConnections, reconnectPeer]);
  
  // ==============================================
  // STATS COLLECTION
  // ==============================================
  
  useEffect(() => {
    // Periodically collect stats for all connections
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    
    statsIntervalRef.current = setInterval(async () => {
      if (peerConnections.size === 0) return;
      
      // In real implementation, this would collect actual WebRTC stats
      // For now, we'll simulate stats
      peerConnections.forEach((peerState, participantId) => {
        if (peerState.connectionState === 'connected') {
          // Simulate stats
          connectionStatsRef.current.set(participantId, {
            participantId,
            bytesReceived: Math.floor(Math.random() * 1000000),
            bytesSent: Math.floor(Math.random() * 1000000),
            packetsLost: Math.floor(Math.random() * 10),
            roundTripTime: Math.floor(Math.random() * 200),
            jitter: Math.floor(Math.random() * 50),
            availableBandwidth: Math.floor(Math.random() * 5000000),
          });
        }
      });
    }, STATS_INTERVAL);
    
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [peerConnections]);
  
  // ==============================================
  // CONNECTION STATE MONITORING
  // ==============================================
  
  useEffect(() => {
    // Log connection state changes
    peerConnections.forEach((peerState, participantId) => {
      console.log(`🔌 Connection to ${participantId}: ${peerState.connectionState}`);
    });
  }, [peerConnections]);
  
  // ==============================================
  // CLEANUP
  // ==============================================
  
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      connectionStatsRef.current.clear();
    };
  }, []);
  
  // ==============================================
  // RETURN
  // ==============================================
  
  return {
    // Connection state
    peerConnections,
    connectedPeers,
    connectingPeers,
    disconnectedPeers,
    
    // Connection stats
    getConnectionStats,
    getAllConnectionStats,
    
    // Connection management
    reconnectPeer,
    closePeerConnection,
    
    // Connection health
    getConnectionQuality,
    isConnectionHealthy,
    
    // Utilities
    totalConnections,
    activeConnections,
  };
}
