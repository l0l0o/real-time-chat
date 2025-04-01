import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { messageService, Message } from "../../services/messageService";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import { Heart } from "lucide-react";

interface RealTimeMessage {
  id?: string;
  text: string;
  user: {
    email: string;
  };
  createdAt: string;
  userId?: string;
  likes?: {
    id: string;
    email: string;
  }[];
}

interface RealTimeLike {
  messageId: string;
  userId: string;
  email: string;
}

const MessageList: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // socket est nécessaire pour maintenir la référence et éviter la déconnexion
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realTimeMessages, setRealTimeMessages] = useState<RealTimeMessage[]>(
    []
  );
  const [realTimeLikes, setRealTimeLikes] = useState<Record<string, string[]>>(
    {}
  );
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery<Message[]>({
    queryKey: ["messages"],
    queryFn: () => messageService.findAll(),
  });

  const likeMutation = useMutation({
    mutationFn: (messageId: string) => messageService.toggleLike(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const newSocket = io("http://localhost:8000");
    setSocket(newSocket);

    // Écouter les nouveaux messages en temps réel
    newSocket.on("messageFromBack", (message: RealTimeMessage) => {
      console.log("Message from server:", message);

      // Éviter d'afficher les messages qui sont déjà dans la base de données
      // Seuls les messages temps réel qui ne sont pas encore synchronisés avec la base
      // seront ajoutés à realTimeMessages
      if (
        !messages?.some(
          (m) =>
            // Pour messages avec ID, vérifier les ID
            (message.id && m.id === message.id) ||
            // Pour messages sans ID mais du même utilisateur, vérifier le contenu et l'heure approximative
            (message.text === m.text &&
              message.user.email === m.user.email &&
              Math.abs(
                new Date(message.createdAt).getTime() -
                  new Date(m.createdAt).getTime()
              ) < 2000)
        )
      ) {
        // S'il s'agit de notre propre message, ne pas l'ajouter à realTimeMessages
        // car il sera bientôt disponible via l'API
        if (user && message.user.email === user.email) {
          // Rafraîchir les messages depuis l'API
          queryClient.invalidateQueries({ queryKey: ["messages"] });
        } else {
          // Si c'est un message d'un autre utilisateur, l'ajouter en temps réel
          setRealTimeMessages((prev) => [...prev, message]);
        }
      }
    });

    // Écouter les likes en temps réel
    newSocket.on("likeFromBack", (like: RealTimeLike) => {
      console.log("Like from server:", like);

      // Mettre à jour les likes en temps réel
      setRealTimeLikes((prev) => {
        const messageId = like.messageId;
        const currentLikes = prev[messageId] || [];

        // Vérifier si l'utilisateur a déjà liké
        const userLikeIndex = currentLikes.findIndex(
          (email) => email === like.email
        );

        if (userLikeIndex === -1) {
          // Ajouter le like
          return {
            ...prev,
            [messageId]: [...currentLikes, like.email],
          };
        } else {
          // Retirer le like
          const updatedLikes = [...currentLikes];
          updatedLikes.splice(userLikeIndex, 1);
          return {
            ...prev,
            [messageId]: updatedLikes,
          };
        }
      });

      // Rafraîchir les messages depuis l'API après un délai
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      }, 500);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient, messages, user]);

  // Nettoyer les messages temps réel quand les données API sont rafraîchies
  useEffect(() => {
    if (messages && messages.length > 0) {
      setRealTimeMessages((prev) =>
        prev.filter(
          (rtMsg) =>
            !messages.some(
              (m) =>
                (rtMsg.id && m.id === rtMsg.id) ||
                (rtMsg.text === m.text &&
                  rtMsg.user.email === m.user.email &&
                  Math.abs(
                    new Date(rtMsg.createdAt).getTime() -
                      new Date(m.createdAt).getTime()
                  ) < 2000)
            )
        )
      );
    }
  }, [messages]);

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom();
  }, [messages, realTimeMessages]);

  // Formatter la date avec le fuseau horaire local de la France
  const formatDateTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleLike = (messageId: string) => {
    if (!user) return;

    // Émettre un événement de like en temps réel
    if (socket) {
      socket.emit("likeFromFront", {
        messageId,
        userId: user.id,
        email: user.email,
      });
    }

    // Effectuer la mutation pour enregistrer le like dans la base de données
    likeMutation.mutate(messageId);
  };

  const hasUserLiked = (
    message: Message | RealTimeMessage,
    userId?: string
  ) => {
    if (!userId) return false;

    // Pour les messages de la base de données
    if ("likes" in message && Array.isArray(message.likes)) {
      return message.likes.some((like) => like.id === userId);
    }

    // Pour les messages en temps réel
    if (message.id && realTimeLikes[message.id]) {
      return realTimeLikes[message.id].includes(user?.email || "");
    }

    return false;
  };

  const getLikeCount = (message: Message | RealTimeMessage) => {
    // Pour les messages de la base de données
    if ("likes" in message && Array.isArray(message.likes)) {
      return message.likes.length;
    }

    // Pour les messages en temps réel
    if (message.id && realTimeLikes[message.id]) {
      return realTimeLikes[message.id].length;
    }

    return 0;
  };

  // Nouvelle fonction pour déterminer si le cœur doit être coloré
  const getHeartClass = (
    message: Message | RealTimeMessage,
    userId?: string
  ) => {
    const likeCount = getLikeCount(message);
    const userHasLiked = hasUserLiked(message, userId);

    if (userHasLiked) {
      return "fill-red-500 text-red-500"; // L'utilisateur a liké
    } else if (likeCount > 0) {
      return "fill-pink-300 text-pink-300"; // Au moins un like mais pas de l'utilisateur actuel
    } else {
      return "text-gray-400"; // Pas de likes
    }
  };

  if (isLoading) {
    return <div className="text-center">Chargement des messages...</div>;
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        Erreur lors du chargement des messages. Veuillez réessayer.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages?.map((message) => (
        <div key={message.id} className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-gray-800">{message.text}</p>
          <div className="flex justify-between items-center text-sm text-gray-500/60 mt-4">
            <div className="flex items-center">
              <p>{message?.user?.email}</p>
              <button
                onClick={() => handleLike(message.id)}
                className="ml-3 flex items-center gap-1"
              >
                <Heart size={16} className={getHeartClass(message, user?.id)} />
                {getLikeCount(message) > 0 && (
                  <span className="text-xs">{getLikeCount(message)}</span>
                )}
              </button>
            </div>
            <p className="">{formatDateTime(message.createdAt)}</p>
          </div>
        </div>
      ))}
      {realTimeMessages.map((message, index) => (
        <div
          key={`realtime-${index}`}
          className="rounded-lg bg-blue-50 p-4 shadow-sm"
        >
          <p className="text-gray-800">{message.text}</p>
          <div className="flex justify-between items-center text-sm text-gray-500/60 mt-4">
            <div className="flex items-center">
              <p>{message.user?.email || "Anonyme"}</p>
              {message.id && (
                <button
                  onClick={() => message.id && handleLike(message.id)}
                  className="ml-3 flex items-center gap-1"
                >
                  <Heart
                    size={16}
                    className={getHeartClass(message, user?.id)}
                  />
                  {getLikeCount(message) > 0 && (
                    <span className="text-xs">{getLikeCount(message)}</span>
                  )}
                </button>
              )}
            </div>
            <p className="">{formatDateTime(message.createdAt)}</p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
