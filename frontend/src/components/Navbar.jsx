import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ overlay = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const homeFor = (role) =>
    role === "GUIDE" ? "/guide"
    : role === "DRIVER" ? "/driver"
    : role === "ADMIN" ? "/admin"
    : "/dashboard";

  const link = overlay
    ? "text-white/80 hover:text-white"
    : "text-ink-soft hover:text-brand-600";

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-50"
          : "sticky top-0 z-50 border-b border-sand-200 bg-sand-50/85 backdrop-blur"
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          to="/"
          className={`font-display text-xl font-extrabold tracking-tight ${
            overlay ? "text-white" : "text-brand-600"
          }`}
          style={{ fontVariationSettings: '"wdth" 92' }}
        >
          ROAMIE
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link to="/destinations" className={link}>Destinations</Link>
          <Link to="/packages" className={link}>Packages</Link>
          <Link to="/guides" className={link}>Guides</Link>
          <Link to="/drivers" className={link}>Drivers</Link>
          <Link to="/plan" className={link}>Plan with AI</Link>
                    {user?.role === "TRAVELER" && (
            <Link to="/plans" className={link}>My plans</Link>
          )}
          {user?.role === "TRAVELER" && <Link to="/budget" className={link}>Budget</Link>}
          {user && <Link to="/messages" className={link}>Messages</Link>}

                    {(user?.role === "GUIDE" || user?.role === "DRIVER") && (
            <Link to="/profile" className={link}>My profile</Link>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link to={homeFor(user.role)} className={`hidden sm:block ${link}`}>
                {user.full_name.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className={`rounded-full px-4 py-2 font-medium transition ${
                  overlay
                    ? "bg-white/12 text-white backdrop-blur hover:bg-white/22"
                    : "border border-sand-300 hover:bg-white"
                }`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={link}>Sign in</Link>
              <Link
                to="/register"
                className={`rounded-full px-5 py-2 font-medium transition ${
                  overlay
                    ? "bg-white text-night-900 hover:bg-white/90"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
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