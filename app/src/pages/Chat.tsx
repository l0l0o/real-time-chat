import { useAuth } from "@/contexts/AuthContext";
import MessageForm from "../components/chat/MessageForm";
import MessageList from "../components/chat/MessageList";
import UserInfo from "../components/chat/UserInfo";
import LogoutButton from "../components/LogoutButton";
import OnlineUsers from "../components/chat/OnlineUsers";

const Chat = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto w-full h-screen">
      <div className="rounded-lg w-full h-full">
        <div className="h-5/6 relative">
          <div className="backdrop-blur-sm bg-white/50 h-1/6 absolute top-0 right-0 w-full z-10 shadow-md border-b border-gray-200">
            <OnlineUsers />
          </div>
          <div className="overflow-y-scroll h-full pt-[calc(16.67vh)]">
            <MessageList />
          </div>
        </div>
        <div className="h-1/6 flex justify-center items-center">
          <div className="w-full flex flex-col gap-4">
            {user && (
              <div className="">
                <MessageForm />
              </div>
            )}
            <div className=" flex justify-between">
              <UserInfo />
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
