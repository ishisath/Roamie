import { Link } from "react-router-dom";
import { useTilt } from "../hooks/useTilt";

export default function PhotoCard({ to, image, kicker, title, meta, tall }) {
  const tilt = useTilt(8);

  return (
    <Link
      to={to}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={tilt.style}
      className={`group relative block overflow-hidden rounded-[18px] bg-night-800
                  shadow-[0_18px_50px_-20px_rgba(0,0,0,0.85)]
                  transition-[transform,box-shadow] duration-300 will-change-transform
                  hover:shadow-[0_30px_70px_-24px_rgba(0,0,0,0.95)]
                  ${tall ? "h-[26rem]" : "h-72"}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-night-700 to-night-900" />
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6" style={{ transform: "translateZ(40px)" }}>
        {kicker && (
          <span className="eyebrow text-saffron-400">{kicker}</span>
        )}
        <h3 className="headline mt-1.5 text-2xl text-white">{title}</h3>
        {meta && <p className="mt-1 text-sm text-white/65">{meta}</p>}
      </div>

      <span className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full
                       bg-white/12 text-white opacity-0 backdrop-blur transition
                       group-hover:opacity-100">
        ↗
      </span>
    </Link>
  );
}