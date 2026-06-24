import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';

export default function Preview() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`/seal/${params.id}`, { replace: true });
  }, [params.id, setLocation]);
  return null;
}
