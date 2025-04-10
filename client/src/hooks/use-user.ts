import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser } from "@db/schema";

type RequestResult = {
  ok: true;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: InsertUser
): Promise<RequestResult & { user?: SelectUser }> {
  try {
    console.log(`Sending ${method} request to ${url}`);
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        console.error(`Server error: ${response.status} ${response.statusText}`);
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      console.error(`API error: ${message}`);
      return { ok: false, message };
    }

    // Parse the response to get the user data for login/register
    try {
      const data = await response.json();
      console.log('API response:', data);
      return { 
        ok: true,
        user: data.user || data // handle both {user: {...}} and direct user object formats
      };
    } catch (jsonError) {
      // If response is not JSON, just return success
      console.log('API success (no JSON)');
      return { ok: true };
    }
  } catch (e: any) {
    console.error('Request error:', e);
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<SelectUser | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }

    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false
  });

  const loginMutation = useMutation<RequestResult & { user?: SelectUser }, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      // If we have user data in response, set it directly in the cache
      if (data.user) {
        queryClient.setQueryData(['user'], data.user);
      } else {
        // Otherwise invalidate to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: () => {
      // Set user to null on logout
      queryClient.setQueryData(['user'], null);
    },
  });

  const registerMutation = useMutation<RequestResult & { user?: SelectUser }, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      // If we have user data in response, set it directly in the cache
      if (data.user) {
        queryClient.setQueryData(['user'], data.user);
      } else {
        // Otherwise invalidate to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}
