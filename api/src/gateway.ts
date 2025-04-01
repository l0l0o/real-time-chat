import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface OnlineUser {
  id: string;
  email: string;
  socketId: string;
  lastSeen: Date;
  isActive: boolean;
  hasParticipated: boolean;
}

interface Message {
  id?: string;
  content: string;
  userId: string;
  timestamp?: Date;
  email?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class Gateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  // Stockage des utilisateurs connectés
  private onlineUsers: Map<string, OnlineUser> = new Map();
  // Stockage des utilisateurs qui ont participé à la conversation
  private participantUsers: Set<string> = new Set();

  afterInit(server: Server) {
    console.log('Gateway: WebSocket Gateway initialized');
    this.server = server;
  }

  handleConnection(client: Socket) {
    console.log(`Gateway: Client connected: ${client.id}`);
    // Envoyer la liste actuelle des utilisateurs lors de la connexion
    this.broadcastOnlineUsers();
  }

  handleDisconnect(client: Socket) {
    console.log(`Gateway: Client disconnected: ${client.id}`);

    // Supprimer l'utilisateur de la liste des utilisateurs connectés ou marquer comme inactif
    let userUpdated = false;
    this.onlineUsers.forEach((user, key) => {
      if (user.socketId === client.id) {
        console.log(
          `Gateway: Updating last seen for user: ${user.email} (${key})`,
        );
        // Mettre à jour lastSeen et marquer comme inactif
        user.lastSeen = new Date();
        user.isActive = false;
        this.onlineUsers.set(key, user);
        userUpdated = true;
      }
    });

    if (userUpdated) {
      // Envoyer la liste mise à jour à tous les clients
      this.broadcastOnlineUsers();
    }
  }

  @SubscribeMessage('userConnected')
  handleUserConnected(
    client: Socket,
    payload: {
      userId: string;
      email: string;
      lastSeen?: Date;
      hasParticipated?: boolean;
    },
  ): void {
    console.log(
      `Gateway: User connected event: ${payload.email} (${payload.userId})`,
    );

    if (!payload.userId || !payload.email) {
      console.error(
        'Gateway: Invalid payload for userConnected event',
        payload,
      );
      return;
    }

    // Vérifier si l'utilisateur a participé à la conversation
    const hasParticipated =
      payload.hasParticipated || this.participantUsers.has(payload.userId);

    // Ajouter l'utilisateur à la liste des utilisateurs connectés
    this.onlineUsers.set(payload.userId, {
      id: payload.userId,
      email: payload.email,
      socketId: client.id,
      lastSeen: new Date(),
      isActive: true,
      hasParticipated,
    });

    console.log(`Gateway: Current online users: ${this.onlineUsers.size}`);
    // Afficher tous les utilisateurs connectés
    this.onlineUsers.forEach((user, key) => {
      console.log(
        `Gateway: - ${user.email} (${key}) - Active: ${user.isActive} - Participated: ${user.hasParticipated}`,
      );
    });

    // Envoyer la liste mise à jour à tous les clients
    this.broadcastOnlineUsers();

    // Envoyer spécifiquement à ce client pour s'assurer qu'il reçoit la liste
    client.emit('onlineUsers', Array.from(this.onlineUsers.values()));
  }

  @SubscribeMessage('updateUserStatus')
  handleUpdateUserStatus(
    client: Socket,
    payload: { userId: string; hasParticipated?: boolean },
  ): void {
    console.log(`Gateway: Update user status: ${payload.userId}`);

    if (!payload.userId) return;

    const user = this.onlineUsers.get(payload.userId);
    if (user && payload.hasParticipated) {
      user.hasParticipated = true;
      this.participantUsers.add(payload.userId);
      this.onlineUsers.set(payload.userId, user);

      // Diffuser la mise à jour
      this.broadcastOnlineUsers();
    }
  }

  @SubscribeMessage('messageFromFront')
  handleMessage(client: Socket, payload: Message): void {
    console.log(`Gateway: Received message from client ${client.id}:`, payload);

    if (payload.userId) {
      // Marquer l'utilisateur comme participant
      this.participantUsers.add(payload.userId);

      // Mettre à jour le statut d'utilisateur s'il est en ligne
      const user = this.onlineUsers.get(payload.userId);
      if (user) {
        user.hasParticipated = true;
        this.onlineUsers.set(payload.userId, user);
      }
    }

    // Diffuser le message à tous les clients connectés
    this.server.emit('messageFromBack', payload);
  }

  @SubscribeMessage('messageFromBack')
  handleMessageBack(client: Socket, payload: string): void {
    console.log(`Gateway: Received message from client ${client.id}:`, payload);
    this.server.emit('messageFromFront', `Server received: ${payload}`);
  }

  private broadcastOnlineUsers(): void {
    const users = Array.from(this.onlineUsers.values());
    console.log(`Gateway: Broadcasting ${users.length} online users`);
    this.server.emit('onlineUsers', users);
  }
}
