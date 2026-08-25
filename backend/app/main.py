from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (admin, ai, auth, availability, bids, bookings, budget,
                        destinations, messages, notifications, packages,
                        payments, providers, reviews, suggestions, vehicles)
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1)
app.include_router(destinations.router, prefix=settings.API_V1)
app.include_router(packages.router, prefix=settings.API_V1)
app.include_router(bookings.router, prefix=settings.API_V1)
app.include_router(payments.router, prefix=settings.API_V1)
app.include_router(notifications.router, prefix=settings.API_V1)
app.include_router(ai.router, prefix=settings.API_V1)
app.include_router(budget.router, prefix=settings.API_V1)
app.include_router(availability.router, prefix=settings.API_V1)
app.include_router(messages.router, prefix=settings.API_V1)
app.include_router(vehicles.router, prefix=settings.API_V1)
app.include_router(admin.router, prefix=settings.API_V1)
app.include_router(suggestions.router, prefix=settings.API_V1)
app.include_router(reviews.router, prefix=settings.API_V1)
app.include_router(providers.router, prefix=settings.API_V1)
app.include_router(bids.router, prefix=settings.API_V1)


@app.get("/health")
def health():
    return {"status": "ok"}