export function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Split monthly series into current vs previous for comparison */
export function comparePeriods(series) {
  if (series.length < 2) return { current: series.at(-1)?.amount || 0, previous: 0, delta: 0 };
  const current = series.at(-1).amount;
  const previous = series.at(-2).amount;
  return { current, previous, delta: pctChange(current, previous) };
}

/** Booking funnel — real stages from your booking lifecycle */
export function bookingFunnel(bookings) {
  const created = bookings.length;
  const paid = bookings.filter((b) => b.payment_status === "SUCCESS").length;
  const completed = bookings.filter((b) => b.status === "COMPLETED").length;
  return [
    { label: "Requested", value: created },
    { label: "Paid", value: paid },
    { label: "Completed", value: completed },
  ];
}

export function cancellationRate(bookings) {
  if (!bookings.length) return 0;
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  return Math.round((cancelled / bookings.length) * 100);
}

export function avgBookingValue(bookings) {
  const paid = bookings.filter((b) => b.payment_status === "SUCCESS");
  if (!paid.length) return 0;
  const total = paid.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  return Math.round(total / paid.length);
}

/** Lead time in days between booking creation and trip start */
export function avgLeadTime(bookings) {
  const withDates = bookings.filter((b) => b.created_at && b.start_date);
  if (!withDates.length) return 0;
  const total = withDates.reduce((s, b) => {
    const days = (new Date(b.start_date) - new Date(b.created_at)) / 86400000;
    return s + Math.max(0, days);
  }, 0);
  return Math.round(total / withDates.length);
}

/** Group bookings into a daily/monthly series for charts */
export function monthlySeries(bookings, valueKey = "total_amount") {
  const map = {};
  bookings.forEach((b) => {
    if (!b.start_date) return;
    const k = b.start_date.slice(0, 7);
    map[k] = (map[k] || 0) + Number(b[valueKey] || 0);
  });
  return Object.entries(map)
    .sort()
    .map(([month, amount]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-GB", { month: "short" }),
      amount,
    }));
}

export function occupancyRate(availability) {
  if (!availability.length) return 0;
  const booked = availability.filter((a) => a.status === "BOOKED").length;
  return Math.round((booked / availability.length) * 100);
}