import API from "./axios-client";

export const loginMutationFn = async (data) =>
  await API.post(`/auth/login`, data);

export const registerMutationFn = async (data) =>
  await API.post(`/auth/register`, data);

export const verifyEmailMutationFn = async (data) =>
  await API.post(`/auth/verify/email`, data);

export const forgotPasswordMutationFn = async (data) =>
  await API.post(`/auth/password/forgot`, data);

export const resetPasswordMutationFn = async (data) =>
  await API.post(`/auth/password/reset`, data);

export const verifyMFAMutationFn = async (data) =>
  await API.post(`/mfa/verify`, data);

export const verifyMFALoginMutationFn = async (data) =>
  await API.post(`/mfa/verify-login`, data);

export const logoutMutationFn = async () => await API.post(`/auth/logout`);

export const mfaSetupQueryFn = async () => {
  const response = await API.get(`/mfa/setup`);
  return response.data;
};
export const revokeMFAMutationFn = async () => await API.put(`/mfa/revoke`, {});

// Get current authenticated user — server exposes GET /auth/me
export const getUserSessionQueryFn = async () => await API.get(`/auth/me`);

// Get all auth sessions for current user — server exposes GET /auth/sessions
export const sessionsQueryFn = async () => {
  const response = await API.get(`/auth/sessions`);
  return response.data;
};

// Delete (revoke) a specific auth session
export const sessionDelMutationFn = async (id) =>
  await API.delete(`/auth/sessions/${id}`);
