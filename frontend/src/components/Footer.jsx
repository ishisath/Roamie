import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-sand-300 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-lg font-bold text-brand-600">Roamie</span>
          <p className="mt-2 text-sm text-ink/60">
            Travel Sri Lanka your way — your guide, your driver, your pace.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li><Link to="/destinations" className="hover:text-brand-600">Destinations</Link></li>
            <li><Link to="/packages" className="hover:text-brand-600">Packages</Link></li>
            <li><Link to="/plan" className="hover:text-brand-600">AI Trip Planner</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Work with us</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li><Link to="/register" className="hover:text-brand-600">Become a guide</Link></li>
            <li><Link to="/register" className="hover:text-brand-600">Become a driver</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Support</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>help@roamie.lk</li>
            <li>Negombo, Sri Lanka</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand-300 py-4 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} Roamie. Built as an HND final project.
      </div>
    </footer>
  );
}