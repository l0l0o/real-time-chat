import React, { createContext, useContext, useState, useEffect } from "react";
import { authService, User, AuthFormData } from "../services/authService";
import { presenceService } from "../services/presenceService";

interface AuthContextType {
  user: User | null;
  signIn: (data: AuthFormData) => Promise<void>;
  signUp: (data: AuthFormData) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("AuthContext: initializing auth");
      const token = authService.getToken();
      if (token) {
        console.log("AuthContext: token found, fetching user data");
        try {
          const userData = await authService.getCurrentUser();
          console.log("AuthContext: user data fetched successfully", userData);
          setUser(userData);
        } catch (error) {
          console.error("AuthContext: Error fetching user data:", error);
          authService.removeToken();
        }
      } else {
        console.log("AuthContext: no token found");
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    console.log("AuthContext: user state changed", user);
    if (user) {
      console.log(
        "AuthContext: connecting presence service for user",
        user.email
      );
      presenceService.connect(user);
    } else {
      console.log("AuthContext: disconnecting presence service");
      presenceService.disconnect();
    }
  }, [user]);

  const signIn = async (data: AuthFormData) => {
    console.log("AuthContext: signing in", data.email);
    const response = await authService.signIn(data);
    console.log("AuthContext: sign in successful", response.user);
    setUser(response.user);
  };

  const signUp = async (data: AuthFormData) => {
    console.log("AuthContext: signing up", data.email);
    const response = await authService.signUp(data);
    console.log("AuthContext: sign up successful", response.user);
    setUser(response.user);
  };

  const signOut = () => {
    console.log("AuthContext: signing out");
    authService.removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
