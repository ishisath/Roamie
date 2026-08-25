import client from "./client";

export const authApi = {
  register: (data) => client.post("/auth/register", data),
  login: (data) => client.post("/auth/login", data),
  me: () => client.get("/auth/me"),
  updateMe: (data) => client.patch("/auth/me", data),
};

export const destinationsApi = {
  featured: () => client.get("/destinations/featured"),
  trending: () => client.get("/destinations/trending"),
  categories: () => client.get("/destinations/categories"),
  search: (params) => client.get("/destinations", { params }),
  detail: (slug) => client.get(`/destinations/${slug}`),
};

export const packagesApi = {
  popular: () => client.get("/packages/popular"),
  search: (params) => client.get("/packages", { params }),
  detail: (id) => client.get(`/packages/${id}`),
  mine: () => client.get("/packages/mine"),
  create: (data) => client.post("/packages", data),
};

export const bookingsApi = {
  create: (data) => client.post("/bookings", data),
  list: (params) => client.get("/bookings", { params }),
  detail: (id) => client.get(`/bookings/${id}`),
  cancel: (id, reason) => client.post(`/bookings/${id}/cancel`, { reason }),
};

export const paymentsApi = {
  config: () => client.get("/payments/config"),
  intent: (booking_id) => client.post("/payments/intent", { booking_id }),
  confirm: (data) => client.post("/payments/confirm", data),
  list: () => client.get("/payments"),
  earnings: () => client.get("/payments/earnings"),
};

export const notificationsApi = {
  list: (params) => client.get("/notifications", { params }),
  unreadCount: () => client.get("/notifications/unread-count"),
  markRead: (id) => client.patch(`/notifications/${id}/read`),
};

export const aiApi = {
  plan: (data) => client.post("/ai/plan", data),
  plans: () => client.get("/ai/plans"),
  planDetail: (id) => client.get(`/ai/plans/${id}`),
  save: (id) => client.patch(`/ai/plans/${id}/save`),
  drift: (id) => client.get(`/ai/plans/${id}/drift`),
  ask: (data) => client.post("/ai/ask", data),
};

export const budgetApi = {
  create: (data) => client.post("/budget", data),
  list: () => client.get("/budget"),
  summary: (id) => client.get(`/budget/${id}`),
  addExpense: (id, data) => client.post(`/budget/${id}/expenses`, data),
  deleteExpense: (id) => client.delete(`/budget/expenses/${id}`),
};