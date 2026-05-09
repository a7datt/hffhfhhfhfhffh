export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  } else if (response.status === 403) {
    const errorData = await response.clone().json().catch(() => null);
    if (errorData && errorData.error === 'SUBSCRIPTION_EXPIRED') {
       window.location.href = '/dashboard/subscription';
       throw new Error('اشتراكك منتهي، يرجى التجديد');
    }
    throw new Error('Unauthorized access');
  }

  return response;
}
