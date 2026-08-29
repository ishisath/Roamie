"""Transactional email. Fails silently — email must never break a booking."""
import logging

from app.core.config import settings

log = logging.getLogger(__name__)

# only these notification types are worth an email
EMAILABLE = {
    "BOOKING_CONFIRMED",
    "BOOKING_ACCEPTED",
    "BOOKING_DECLINED",
    "BOOKING_REQUEST",
    "NEW_BOOKING",
    "VERIFICATION",
    "VEHICLE_VERIFICATION",
    "REFUND_ISSUED",
    "BUDGET_ALERT",
    "SUGGESTION_REVIEWED",
    "BID_ACCEPTED",
}


def _shell(title: str, body: str, cta_text: str | None, cta_url: str | None) -> str:
    button = ""
    if cta_text and cta_url:
        button = f"""
        <a href="{cta_url}"
           style="display:inline-block;margin-top:24px;padding:12px 28px;
                  background:#E39A22;color:#0C120F;text-decoration:none;
                  border-radius:999px;font-weight:600;font-size:14px;">
          {cta_text}
        </a>"""

    return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F1EEE6;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;
             border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#0C120F;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:800;
                         letter-spacing:-0.02em;">ROAMIE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0;font-size:22px;color:#14201B;
                       letter-spacing:-0.02em;">{title}</h1>
            <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#4A5952;">
              {body}
            </p>
            {button}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #EBE6D9;">
            <p style="margin:0;font-size:12px;color:#8A958F;">
              Travel Sri Lanka your way — your guide, your driver, your pace.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def send(to: str, subject: str, title: str, body: str,
         cta_text: str | None = None, cta_path: str | None = None) -> bool:
    if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY or not to:
        return False

    # development: Resend's test domain only delivers to the account owner
    real_recipient = to
    if settings.EMAIL_OVERRIDE_TO:
        to = settings.EMAIL_OVERRIDE_TO
        subject = f"[to: {real_recipient}] {subject}"

    cta_url = f"{settings.FRONTEND_URL}{cta_path}" if cta_path else None

    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": _shell(title, body, cta_text, cta_url),
        })
        return True
    except Exception as e:
        # never let email break the request that triggered it
        log.warning("Email to %s failed: %s", to, e)
        return False


def cta_for(notification_type: str) -> tuple[str | None, str | None]:
    """A sensible button per notification type."""
    return {
        "BOOKING_CONFIRMED": ("View your booking", None),
        "BOOKING_ACCEPTED": ("View your booking", None),
        "BOOKING_DECLINED": ("Find another provider", "/guides"),
        "BOOKING_REQUEST": ("Open your dashboard", None),
        "NEW_BOOKING": ("Open your dashboard", None),
        "VERIFICATION": ("Open your dashboard", None),
        "VEHICLE_VERIFICATION": ("View your vehicles", "/driver"),
        "REFUND_ISSUED": ("View your bookings", "/dashboard"),
        "BUDGET_ALERT": ("Open your budget", "/budget"),
        "SUGGESTION_REVIEWED": ("See destinations", "/destinations"),
        "BID_ACCEPTED": ("Open your dashboard", None),
    }.get(notification_type, (None, None))