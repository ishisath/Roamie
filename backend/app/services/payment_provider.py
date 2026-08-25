"""Payment gateway abstraction. Provider is chosen by PAYMENT_PROVIDER in .env."""
import uuid
from abc import ABC, abstractmethod
from decimal import Decimal

from app.core.config import settings


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    def create_intent(self, amount: Decimal, currency: str, reference: str) -> dict:
        ...

    @abstractmethod
    def confirm(self, intent_id: str) -> dict:
        ...

    @abstractmethod
    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        ...


class MockProvider(PaymentProvider):
    """Simulates a gateway. Always succeeds. Real DB records are still written."""
    name = "MOCK"

    def create_intent(self, amount: Decimal, currency: str, reference: str) -> dict:
        return {
            "intent_id": f"mock_pi_{uuid.uuid4().hex[:16]}",
            "client_secret": None,
            "amount": str(amount),
            "currency": currency,
            "reference": reference,
            "status": "REQUIRES_CONFIRMATION",
        }

    def confirm(self, intent_id: str) -> dict:
        return {
            "transaction_id": f"mock_tx_{uuid.uuid4().hex[:16]}",
            "intent_id": intent_id,
            "status": "SUCCESS",
        }

    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        return {
            "refund_id": f"mock_rf_{uuid.uuid4().hex[:16]}",
            "transaction_id": transaction_id,
            "amount": str(amount),
            "status": "SUCCESS",
        }


class StripeProvider(PaymentProvider):
    """Stripe test mode. LKR is not a Stripe charge currency, so amounts are
    converted to USD at a fixed demo rate."""
    name = "STRIPE"
    LKR_TO_USD = Decimal("0.0033")

    def __init__(self):
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.stripe = stripe

    def _to_minor_units(self, amount: Decimal, currency: str) -> tuple[int, str]:
        if currency.upper() == "LKR":
            usd = (amount * self.LKR_TO_USD).quantize(Decimal("0.01"))
            return max(int(usd * 100), 50), "usd"
        return int(amount * 100), currency.lower()

    def create_intent(self, amount: Decimal, currency: str, reference: str) -> dict:
        minor, cur = self._to_minor_units(amount, currency)
        intent = self.stripe.PaymentIntent.create(
            amount=minor,
            currency=cur,
            metadata={
                "reference": reference,
                "original_amount": str(amount),
                "original_currency": currency,
            },
            automatic_payment_methods={"enabled": True},
        )
        return {
            "intent_id": intent.id,
            "client_secret": intent.client_secret,
            "amount": str(amount),
            "currency": currency,
            "charged_minor_units": minor,
            "charged_currency": cur,
            "status": intent.status,
        }

    def confirm(self, intent_id: str) -> dict:
        intent = self.stripe.PaymentIntent.retrieve(intent_id)
        succeeded = intent.status == "succeeded"
        return {
            "transaction_id": intent.latest_charge or intent.id,
            "intent_id": intent.id,
            "status": "SUCCESS" if succeeded else "FAILED",
            "stripe_status": intent.status,
        }

    def refund(self, transaction_id: str, amount: Decimal) -> dict:
        rf = self.stripe.Refund.create(charge=transaction_id)
        return {
            "refund_id": rf.id,
            "transaction_id": transaction_id,
            "amount": str(amount),
            "status": "SUCCESS" if rf.status == "succeeded" else "FAILED",
        }


def get_provider() -> PaymentProvider:
    if settings.PAYMENT_PROVIDER == "STRIPE" and settings.STRIPE_SECRET_KEY:
        return StripeProvider()
    return MockProvider()