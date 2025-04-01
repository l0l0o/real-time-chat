import { io, Socket } from "socket.io-client";
import { User } from "./authService";

export interface OnlineUser {
  id: string;
  email: string;
  socketId: string;
  lastSeen?: Date;
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

class PresenceService {
  private socket: Socket | null = null;
  private onlineUsers: OnlineUser[] = [];
  private participantUsers: Record<string, boolean> = {}; // Pour suivre les utilisateurs qui ont participé
  private onlineUsersUpdateCallbacks: ((users: OnlineUser[]) => void)[] = [];
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(user: User) {
    console.log("PresenceService: tentative de connexion pour", user);
    if (this.socket) {
      this.socket.disconnect();
    }

    // Réinitialiser les tentatives de reconnexion
    this.reconnectAttempts = 0;

    // Créer une nouvelle connexion
    this.createSocketConnection(user);
  }

  private createSocketConnection(user: User) {
    // Annuler tout timeout existant
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.socket = io("http://localhost:8000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    this.socket.on("connect", () => {
      console.log(
        "PresenceService: connecté au serveur socket avec ID:",
        this.socket?.id
      );
      this.reconnectAttempts = 0;

      // Identifier l'utilisateur
      if (this.socket && user) {
        this.socket.emit("userConnected", {
          userId: user.id,
          email: user.email,
          lastSeen: new Date(),
          hasParticipated: !!this.participantUsers[user.id],
        });
        console.log(
          "PresenceService: événement userConnected émis pour",
          user.email
        );
      }
    });

    // Écouter les mises à jour des utilisateurs en ligne
    this.socket.on("onlineUsers", (users: OnlineUser[]) => {
      console.log("PresenceService: onlineUsers reçu", users);
      this.onlineUsers = users.map((user) => ({
        ...user,
        lastSeen: user.lastSeen ? new Date(user.lastSeen) : undefined,
      }));
      this.notifyOnlineUsersUpdate();
    });

    // Écouter les messages pour suivre les participants
    this.socket.on("messageFromBack", (message: Message) => {
      if (message && message.userId) {
        this.participantUsers[message.userId] = true;
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("PresenceService: erreur de connexion socket:", error);
      this.handleReconnect(user);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("PresenceService: déconnecté du serveur, raison:", reason);
      if (reason === "io server disconnect") {
        // Le serveur a forcé la déconnexion, tentative de reconnexion
        this.handleReconnect(user);
      }
    });
  }

  // Marquer un utilisateur comme participant
  addParticipant(userId: string) {
    this.participantUsers[userId] = true;
    // Si l'utilisateur actuel est connecté, mettre à jour son statut
    if (this.socket && this.socket.connected) {
      const currentUser = this.onlineUsers.find((u) => u.id === userId);
      if (currentUser) {
        this.socket.emit("updateUserStatus", {
          userId,
          hasParticipated: true,
        });
      }
    }
  }

  private handleReconnect(user: User) {
    this.reconnectAttempts++;

    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(
        `PresenceService: tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );

      this.connectionTimeout = setTimeout(() => {
        if (this.socket) {
          this.socket.disconnect();
        }
        this.createSocketConnection(user);
      }, 2000);
    } else {
      console.error(
        "PresenceService: nombre maximum de tentatives de reconnexion atteint"
      );
    }
  }

  disconnect() {
    console.log("PresenceService: déconnexion");
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Réinitialiser l'état
    this.onlineUsers = [];
    this.notifyOnlineUsersUpdate();
  }

  getOnlineUsers(): OnlineUser[] {
    return this.onlineUsers;
  }

  onOnlineUsersUpdate(callback: (users: OnlineUser[]) => void) {
    console.log("PresenceService: nouvel abonnement aux mises à jour");
    this.onlineUsersUpdateCallbacks.push(callback);

    // Envoyer immédiatement l'état actuel
    console.log("PresenceService: état actuel envoyé", this.onlineUsers);
    callback(this.onlineUsers);

    // Retourner une fonction pour se désabonner
    return () => {
      console.log("PresenceService: désabonnement");
      this.onlineUsersUpdateCallbacks = this.onlineUsersUpdateCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  private notifyOnlineUsersUpdate() {
    console.log(
      "PresenceService: notification de mise à jour des utilisateurs",
      this.onlineUsers.length
    );
    this.onlineUsersUpdateCallbacks.forEach((callback) => {
      callback(this.onlineUsers);
    });
  }
}

export const presenceService = new PresenceService();
