import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";

export function useAuth() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("auth_token");
      setToken(null);
      setLocation("/login");
    }
  }, [isError, setLocation]);

  const login = (newToken: string) => {
    localStorage.setItem("auth_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setLocation("/login");
  };

  return {
    user,
    token,
    isLoading: isLoading && !!token,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
