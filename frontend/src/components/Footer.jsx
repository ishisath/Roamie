import { Link } from "react-router-dom";

export default function Footer() {
  const col = "text-sm text-white/55 hover:text-white transition";

  return (
    <footer className="border-t border-white/8 bg-night-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="font-display text-lg font-extrabold tracking-tight text-white"
                style={{ fontVariationSettings: '"wdth" 92' }}>
            ROAMIE
          </span>
          <p className="mt-3 max-w-xs text-sm text-white/50">
            Travel Sri Lanka your way — your guide, your driver, your pace.
          </p>
        </div>

        <div>
          <h4 className="eyebrow text-saffron-400">Explore</h4>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/destinations" className={col}>Destinations</Link></li>
            <li><Link to="/packages" className={col}>Packages</Link></li>
            <li><Link to="/plan" className={col}>AI trip planner</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow text-saffron-400">Work with us</h4>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/guides" className={col}>Browse guides</Link></li>
            <li><Link to="/drivers" className={col}>Browse drivers</Link></li>
            <li><Link to="/register" className={col}>Become a provider</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow text-saffron-400">Support</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-white/55">
            <li>help@roamie.lk</li>
            <li>Negombo, Sri Lanka</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8 py-5 text-center text-xs text-white/35">
        © {new Date().getFullYear()} Roamie
      </div>
    </footer>
  );
}