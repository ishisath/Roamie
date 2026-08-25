import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const saveSession = (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    saveSession(data);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await authApi.register(payload);
    saveSession(data);
    return data.user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);