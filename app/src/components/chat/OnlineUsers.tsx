import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { presenceService, OnlineUser } from "../../services/presenceService";
import { Users, Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const OnlineUsers: React.FC = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();

  // Mettre à jour l'heure actuelle toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    console.log("OnlineUsers: user state changed", user);
    if (!user) return;

    // S'abonner aux mises à jour des utilisateurs en ligne
    console.log("OnlineUsers: subscribing to online users updates");
    const unsubscribe = presenceService.onOnlineUsersUpdate((users) => {
      console.log("OnlineUsers: received update with users", users);
      setOnlineUsers(users);
    });

    return () => {
      console.log("OnlineUsers: cleanup effect");
      unsubscribe();
    };
  }, [user]);

  // Fonction pour formater le temps écoulé
  const formatLastSeen = (date?: Date) => {
    if (!date) return "Inconnu";

    try {
      // On utilise directement formatDistanceToNow pour la durée écoulée
      // Le re-render forcé par currentTime permet de rafraîchir l'affichage
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: fr,
        includeSeconds: true,
      });
    } catch (error) {
      console.error("Erreur de formatage de la date:", error);
      return "Date invalide";
    }
  };

  console.log(
    "OnlineUsers: rendering with",
    onlineUsers.length,
    "users",
    currentTime
  );

  // Séparer les utilisateurs actifs et inactifs
  const activeUsers = onlineUsers.filter((user) => user.isActive);
  const inactiveUsers = onlineUsers.filter((user) => !user.isActive);

  // Trier les utilisateurs : d'abord ceux qui ont participé, puis par dernière activité
  const sortUsers = (users: OnlineUser[]) => {
    return [...users].sort((a, b) => {
      if (a.hasParticipated !== b.hasParticipated) {
        return a.hasParticipated ? -1 : 1;
      }

      if (!a.lastSeen || !b.lastSeen) return 0;
      return b.lastSeen.getTime() - a.lastSeen.getTime();
    });
  };

  const sortedActiveUsers = sortUsers(activeUsers);
  const sortedInactiveUsers = sortUsers(inactiveUsers);

  return (
    <div className="h-full flex items-center p-2">
      <div className="w-full bg-white/80 rounded-lg shadow-sm p-3">
        <div className="flex items-center mb-3 border-b pb-2">
          <Users className="text-indigo-600 mr-2" size={20} />
          <h3 className="text-lg font-semibold">
            Utilisateurs{" "}
            <span className="bg-indigo-600 text-white rounded-full px-2 py-1 text-xs ml-2">
              {activeUsers.length} en ligne
            </span>
          </h3>
        </div>

        <div className="space-y-1 max-h-24 overflow-y-auto">
          {sortedActiveUsers.length > 0 ? (
            sortedActiveUsers.map((onlineUser) => (
              <div
                key={onlineUser.socketId}
                className={`flex items-center gap-2 p-1 rounded ${
                  onlineUser.hasParticipated
                    ? "bg-indigo-50"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className="text-sm font-medium truncate">
                      {onlineUser.email}
                    </span>
                    {onlineUser.hasParticipated && (
                      <MessageSquare
                        size={14}
                        className="text-indigo-600 ml-1"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">
              Aucun utilisateur en ligne
            </div>
          )}

          {sortedInactiveUsers.length > 0 && (
            <>
              <div className="text-xs text-gray-500 mt-2 pt-1 border-t">
                Utilisateurs déconnectés
              </div>
              {sortedInactiveUsers.map((offlineUser) => (
                <div
                  key={offlineUser.socketId}
                  className={`flex items-center gap-2 p-1 rounded ${
                    offlineUser.hasParticipated ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 truncate">
                        {offlineUser.email}
                      </span>
                      {offlineUser.hasParticipated && (
                        <MessageSquare
                          size={14}
                          className="text-gray-500 ml-1"
                        />
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock size={12} className="mr-1" />
                      <span>{formatLastSeen(offlineUser.lastSeen)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineUsers;
