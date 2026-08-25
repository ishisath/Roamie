import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, try the refresh token once, then give up and log out
let refreshing = false;

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retried && !refreshing) {
      original._retried = true;
      const refresh = localStorage.getItem("refresh_token");

      if (refresh) {
        try {
          refreshing = true;
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            { refresh_token: refresh }
          );
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return client(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        } finally {
          refreshing = false;
        }
      } else {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;