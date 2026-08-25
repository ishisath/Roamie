export default function StarRating({ value = 0, onChange, size = "text-2xl", readOnly }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={`${size} leading-none transition ${
            n <= value ? "text-amber-500" : "text-sand-300"
          } ${readOnly ? "cursor-default" : "hover:scale-110"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}