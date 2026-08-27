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
  update: (id, data) => client.patch(`/packages/${id}`, data),
  deactivate: (id) => client.delete(`/packages/${id}`),
  addPhoto: (id, url) => client.post(`/packages/${id}/photos`, { url }),
};

export const providersApi = {
  guides: (params) => client.get("/providers/guides", { params }),
  drivers: (params) => client.get("/providers/drivers", { params }),
  profile: (userId) => client.get(`/providers/${userId}`),
};

export const bookingsApi = {
  create: (data) => client.post("/bookings", data),
  list: (params) => client.get("/bookings", { params }),
  detail: (id) => client.get(`/bookings/${id}`),
  cancel: (id, reason) => client.post(`/bookings/${id}/cancel`, { reason }),
  tripStatus: (itemId, status, note) =>
    client.patch(`/bookings/items/${itemId}/trip-status`, { status, note }),
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
  markAllRead: () => client.patch("/notifications/read-all"),
};

export const aiApi = {
  plan: (data) => client.post("/ai/plan", data),
  plans: () => client.get("/ai/plans"),
  planDetail: (id) => client.get(`/ai/plans/${id}`),
  planForBooking: (bookingId) => client.get(`/ai/bookings/${bookingId}/plan`),
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

export const availabilityApi = {
  mine: () => client.get("/availability/me"),
  set: (dates, status) => client.put("/availability/me", { dates, status }),
  provider: (userId) => client.get(`/availability/provider/${userId}`),
};

export const vehiclesApi = {
  mine: () => client.get("/vehicles/mine"),
  create: (data) => client.post("/vehicles", data),
  update: (id, data) => client.patch(`/vehicles/${id}`, data),
  deactivate: (id) => client.delete(`/vehicles/${id}`),
};

export const messagesApi = {
  threads: () => client.get("/messages/threads"),
  list: (bookingId) => client.get(`/messages/${bookingId}`),
  send: (bookingId, body) => client.post(`/messages/${bookingId}`, { body }),
  unreadCount: () => client.get("/messages/unread/count"),
};

export const reviewsApi = {
  pending: () => client.get("/reviews/pending"),
  create: (data) => client.post("/reviews", data),
  forSubject: (type, id) => client.get(`/reviews/subject/${type}/${id}`),
  mine: () => client.get("/reviews/mine"),
};

export const suggestionsApi = {
  create: (data) => client.post("/suggestions", data),
  mine: () => client.get("/suggestions/mine"),
};

export const reportsApi = {
  create: (data) => client.post("/reports", data),
};

export const bidsApi = {
  createRequest: (data) => client.post("/requests", data),
  myRequests: () => client.get("/requests/mine"),
  closeRequest: (id) => client.delete(`/requests/${id}`),
  openRequests: () => client.get("/requests"),
  submitBid: (requestId, data) => client.post(`/requests/${requestId}/bids`, data),
  acceptBid: (bidId) => client.post(`/bids/${bidId}/accept`),
  myBids: () => client.get("/bids/mine"),
  withdraw: (id) => client.delete(`/bids/${id}`),
};

export const adminApi = {
  analytics: () => client.get("/admin/analytics"),
  users: (params) => client.get("/admin/users", { params }),
  setUserStatus: (id, is_active, note) =>
    client.patch(`/admin/users/${id}/status`, { is_active, note }),

  pendingGuides: () => client.get("/admin/verifications/guides"),
  pendingDrivers: () => client.get("/admin/verifications/drivers"),
  pendingVehicles: () => client.get("/admin/verifications/vehicles"),
  verifyGuide: (id, action, note) =>
    client.patch(`/admin/verifications/guides/${id}`, { action, note }),
  verifyDriver: (id, action, note) =>
    client.patch(`/admin/verifications/drivers/${id}`, { action, note }),
  verifyVehicle: (id, action, note) =>
    client.patch(`/admin/verifications/vehicles/${id}`, { action, note }),

  suggestions: (status) => client.get("/admin/suggestions", { params: { status } }),
  reviewSuggestion: (id, action, note) =>
    client.patch(`/admin/suggestions/${id}`, { action, note }),

  setFlags: (id, params) =>
    client.patch(`/admin/destinations/${id}/flags`, null, { params }),
  bookings: (params) => client.get("/admin/bookings", { params }),
  payments: (params) => client.get("/admin/payments", { params }),
  reports: (status) => client.get("/admin/reports", { params: { status } }),
  resolveReport: (id, status, admin_note) =>
    client.patch(`/admin/reports/${id}`, { status, admin_note }),
};