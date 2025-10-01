import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthed(!!user);
      setLoading(false);
      if (!user) {
        navigate("/auth");
      }
    });
    return unsubscribe;
  }, [navigate]);

  if (loading) return null;

  return authed ? <>{children}</> : null;
}
