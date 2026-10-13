import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { setToken, clearToken } from '@/lib/auth';

export function useAuth() {
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await api.post<{ token: string; expiresIn: string }>('/v1/admin/auth/login', {
        username,
        password,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setToken(data.token);
      navigate('/');
    },
  });

  const logout = () => {
    clearToken();
    navigate('/login');
  };

  return { loginMutation, logout };
}
