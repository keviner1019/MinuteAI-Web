// PeerManager Class - Manages Multiple Peer Connections in a Mesh Network
// Based on MEETING_MODULE_RECONSTRUCTION_PLAN.md

import { PeerConnection, PeerConnectionConfig } from './peer-connection';

export interface PeerManagerConfig {
  localUserId: string;
  onSignal: (signal: any) => void;
}

export class PeerManager {
  private connections: Map<string, PeerConnection>;
  private localUserId: string;
  private onSignal: (signal: any) => void;

  constructor(config: PeerManagerConfig) {
    this.connections = new Map();
    this.localUserId = config.localUserId;
    this.onSignal = config.onSignal;

    console.log(`✅ PeerManager initialized for user ${this.localUserId}`);
  }

  // ==============================================
  // CONNECTION LIFECYCLE
  // ==============================================

  /**
   * Create a new peer connection
   * @param remoteUserId - The ID of the remote user
   * @param isPolite - Whether this peer should be polite in Perfect Negotiation
   * @returns The created PeerConnection instance
   */
  async createConnection(remoteUserId: string, isPolite: boolean): Promise<PeerConnection> {
    if (this.connections.has(remoteUserId)) {
      console.warn(`Connection to ${remoteUserId} already exists`);
      return this.connections.get(remoteUserId)!;
    }

    console.log(
      `🔗 Creating peer connection: ${this.localUserId} → ${remoteUserId} (${isPolite ? 'polite' : 'impolite'})`
    );

    const peerConnection = new PeerConnection({
      remoteUserId,
      isPolite,
      onSignal: (signal) => {
        // Add sender information
        this.onSignal({
          ...signal,
          from: this.localUserId,
        });
      },
    });

    // Store the connection
    this.connections.set(remoteUserId, peerConnection);

    // Set up event listeners
    this.setupConnectionEvents(remoteUserId, peerConnection);

    return peerConnection;
  }

  /**
   * Get an existing peer connection
   */
  getConnection(remoteUserId: string): PeerConnection | null {
    return this.connections.get(remoteUserId) || null;
  }

  /**
   * Close and remove a peer connection
   */
  closeConnection(remoteUserId: string): void {
    const connection = this.connections.get(remoteUserId);
    if (connection) {
      console.log(`🔌 Closing connection to ${remoteUserId}`);
      connection.close();
      this.connections.delete(remoteUserId);
    }
  }

  /**
   * Close all peer connections
   */
  closeAllConnections(): void {
    console.log(`🔌 Closing all ${this.connections.size} peer connections`);

    this.connections.forEach((connection, userId) => {
      connection.close();
    });

    this.connections.clear();
  }

  // ==============================================
  // EVENT HANDLING
  // ==============================================

  private setupConnectionEvents(remoteUserId: string, connection: PeerConnection) {
    // Connection state changes
    connection.on('connection-state-change', (state: RTCPeerConnectionState) => {
      console.log(`🔌 Connection state (${remoteUserId}): ${state}`);
      this.emit('connection-state-change', { userId: remoteUserId, state });
    });

    // ICE connection state changes
    connection.on('ice-connection-state-change', (state: RTCIceConnectionState) => {
      console.log(`🧊 ICE state (${remoteUserId}): ${state}`);
      this.emit('ice-connection-state-change', { userId: remoteUserId, state });
    });

    // Remote track received
    connection.on('track', ({ track, stream }: { track: MediaStreamTrack; stream: MediaStream }) => {
      console.log(`🎵 Received ${track.kind} track from ${remoteUserId}`);
      this.emit('track', { userId: remoteUserId, track, stream });
    });

    // Data channel events
    connection.on('data-channel-open', () => {
      console.log(`📡 Data channel opened with ${remoteUserId}`);
      this.emit('data-channel-open', { userId: remoteUserId });
    });

    connection.on('data-message', (data: any) => {
      console.log(`📨 Data message from ${remoteUserId}:`, data);
      this.emit('data-message', { userId: remoteUserId, data });
    });

    // Connection events
    connection.on('connected', () => {
      console.log(`✅ Connected to ${remoteUserId}`);
      this.emit('peer-connected', { userId: remoteUserId });
    });

    connection.on('disconnected', () => {
      console.warn(`⚠️ Disconnected from ${remoteUserId}`);
      this.emit('peer-disconnected', { userId: remoteUserId });
    });

    connection.on('failed', () => {
      console.error(`❌ Connection failed with ${remoteUserId}`);
      this.emit('peer-failed', { userId: remoteUserId });
    });

    connection.on('reconnection-failed', () => {
      console.error(`❌ Reconnection failed with ${remoteUserId}`);
      this.emit('peer-reconnection-failed', { userId: remoteUserId });
      // Optionally close the connection
      this.closeConnection(remoteUserId);
    });
  }

  // ==============================================
  // MEDIA BROADCASTING
  // ==============================================

  /**
   * Add a track to all peer connections
   * @param track - The MediaStreamTrack to broadcast
   * @param stream - The MediaStream containing the track
   */
  broadcastTrack(track: MediaStreamTrack, stream: MediaStream): void {
    console.log(`📡 Broadcasting ${track.kind} track to ${this.connections.size} peers`);

    this.connections.forEach((connection, userId) => {
      try {
        connection.addTrack(track, stream);
        console.log(`✅ Added ${track.kind} track to ${userId}`);
      } catch (error) {
        console.error(`Failed to add track to ${userId}:`, error);
      }
    });
  }

  /**
   * Remove a track from all peer connections
   * @param trackId - The ID of the track to remove
   */
  stopBroadcastingTrack(trackId: string): void {
    console.log(`📡 Removing track ${trackId} from ${this.connections.size} peers`);

    this.connections.forEach((connection, userId) => {
      try {
        connection.removeTrack(trackId);
        console.log(`✅ Removed track from ${userId}`);
      } catch (error) {
        console.error(`Failed to remove track from ${userId}:`, error);
      }
    });
  }

  /**
   * Replace a track on all peer connections
   * @param oldTrackId - The ID of the track to replace
   * @param newTrack - The new MediaStreamTrack
   */
  async replaceTrackOnAllConnections(oldTrackId: string, newTrack: MediaStreamTrack): Promise<void> {
    console.log(`🔄 Replacing track ${oldTrackId} with ${newTrack.id} on all connections`);

    const promises = Array.from(this.connections.entries()).map(async ([userId, connection]) => {
      try {
        await connection.replaceTrack(oldTrackId, newTrack);
        console.log(`✅ Replaced track on ${userId}`);
      } catch (error) {
        console.error(`Failed to replace track on ${userId}:`, error);
      }
    });

    await Promise.all(promises);
  }

  // ==============================================
  // DATA CHANNEL BROADCASTING
  // ==============================================

  /**
   * Send data to a specific peer
   */
  sendDataToPeer(userId: string, data: any): boolean {
    const connection = this.connections.get(userId);
    if (connection) {
      return connection.sendData(data);
    }
    console.warn(`No connection to ${userId}`);
    return false;
  }

  /**
   * Broadcast data to all peers
   */
  broadcastData(data: any): void {
    console.log(`📡 Broadcasting data to ${this.connections.size} peers`);

    let successCount = 0;
    this.connections.forEach((connection, userId) => {
      if (connection.sendData(data)) {
        successCount++;
      }
    });

    console.log(`✅ Data sent to ${successCount}/${this.connections.size} peers`);
  }

  // ==============================================
  // STATE QUERIES
  // ==============================================

  /**
   * Get all peer connections
   */
  getAllConnections(): PeerConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUserIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get connection state for a specific user
   */
  getConnectionState(remoteUserId: string): RTCPeerConnectionState | null {
    const connection = this.connections.get(remoteUserId);
    return connection ? connection.connectionState : null;
  }

  /**
   * Check if connected to a specific user
   */
  isConnected(remoteUserId: string): boolean {
    const connection = this.connections.get(remoteUserId);
    return connection ? connection.connectionState === 'connected' : false;
  }

  /**
   * Get number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get number of connected peers
   */
  getConnectedCount(): number {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.connectionState === 'connected'
    ).length;
  }

  /**
   * Get statistics for all connections
   */
  async getAllStats(): Promise<Map<string, RTCStatsReport>> {
    const stats = new Map<string, RTCStatsReport>();

    const promises = Array.from(this.connections.entries()).map(async ([userId, connection]) => {
      try {
        const report = await connection.stats;
        stats.set(userId, report);
      } catch (error) {
        console.error(`Failed to get stats for ${userId}:`, error);
      }
    });

    await Promise.all(promises);
    return stats;
  }

  // ==============================================
  // EVENT EMITTER (Simple implementation)
  // ==============================================

  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ==============================================
  // CLEANUP
  // ==============================================

  destroy(): void {
    console.log(`🗑️ Destroying PeerManager`);
    this.closeAllConnections();
    this.listeners.clear();
  }
}
