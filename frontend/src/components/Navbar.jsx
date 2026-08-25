import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-sand-300/70 bg-sand-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-bold tracking-tight text-brand-600">
          Roamie
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/destinations" className="hover:text-brand-600">Destinations</Link>
          <Link to="/packages" className="hover:text-brand-600">Packages</Link>
          <Link to="/plan" className="hover:text-brand-600">Plan with AI</Link>
          {user?.role === "TRAVELER" && (
    <Link to="/budget" className="hover:text-brand-600">Budget</Link>
  )}
          
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className="hidden sm:block hover:text-brand-600">
                {user.full_name.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-sand-300 px-3 py-1.5 hover:bg-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-brand-600">Sign in</Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}