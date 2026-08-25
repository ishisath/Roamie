from app.db.base_class import Base  # noqa

from app.models.user import (User, TravelerProfile, GuideProfile,  # noqa
                             DriverProfile, Vehicle)
from app.models.destination import (DestinationCategory, Destination,  # noqa
                                    DestinationPhoto, DestinationSuggestion)
from app.models.package import (Package, PackagePhoto, PackageDate,  # noqa
                                Availability)
from app.models.booking import (Booking, BookingItem, TripStatusEvent,  # noqa
                                TripRequest, Bid)
from app.models.payment import Payment, Refund, TripBudget, Expense  # noqa
from app.models.ai import (TripPlan, ItineraryItem, PlanRevision,  # noqa
                           AIMessage, WeatherCache)
from app.models.social import Message, Review, Report, Notification  # noqa