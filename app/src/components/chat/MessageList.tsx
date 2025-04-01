import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { messageService, Message } from "../../services/messageService";
import { io, Socket } from "socket.io-client";

interface RealTimeMessage {
  text: string;
  user: {
    email: string;
  };
  createdAt: string;
}

const MessageList: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realTimeMessages, setRealTimeMessages] = useState<RealTimeMessage[]>(
    []
  );
  const queryClient = useQueryClient();

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery<Message[]>({
    queryKey: ["messages"],
    queryFn: () => messageService.findAll(),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const newSocket = io("http://localhost:8000");
    setSocket(newSocket);

    newSocket.on("messageFromBack", (message: RealTimeMessage) => {
      console.log("Message from server:", message);
      setRealTimeMessages((prev) => [...prev, message]);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, realTimeMessages]);

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
            <p>{message?.user?.email}</p>
            <p className="">{new Date(message.createdAt).toLocaleString()}</p>
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
            <p>{message.user?.email || "Anonyme"}</p>
            <p className="">{new Date(message.createdAt).toLocaleString()}</p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
