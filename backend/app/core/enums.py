class Role:
    TRAVELER = "TRAVELER"
    GUIDE = "GUIDE"
    DRIVER = "DRIVER"
    ADMIN = "ADMIN"


class VerificationStatus:
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CHANGES_REQUESTED = "CHANGES_REQUESTED"


class ContentStatus:
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    REMOVED = "REMOVED"


class SuggestionKind:
    NEW = "NEW"
    UPDATE = "UPDATE"


class BookingType:
    PACKAGE = "PACKAGE"
    GUIDE = "GUIDE"
    DRIVER = "DRIVER"
    GUIDE_DRIVER = "GUIDE_DRIVER"
    BID = "BID"


class BookingStatus:
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ServiceType:
    PACKAGE = "PACKAGE"
    GUIDE = "GUIDE"
    DRIVER = "DRIVER"


class ProviderStatus:
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"


class TripStatus:
    CONFIRMED = "CONFIRMED"
    ON_THE_WAY = "ON_THE_WAY"
    PICKED_UP = "PICKED_UP"
    STARTED = "STARTED"
    COMPLETED = "COMPLETED"


class AvailabilityStatus:
    AVAILABLE = "AVAILABLE"
    BOOKED = "BOOKED"
    UNAVAILABLE = "UNAVAILABLE"


class RequestStatus:
    OPEN = "OPEN"
    AWARDED = "AWARDED"
    CLOSED = "CLOSED"


class BidStatus:
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class PaymentStatus:
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class ExpenseCategory:
    PACKAGE = "PACKAGE"
    GUIDE = "GUIDE"
    DRIVER = "DRIVER"
    TRANSPORT = "TRANSPORT"
    ACCOMMODATION = "ACCOMMODATION"
    FOOD = "FOOD"
    ACTIVITIES = "ACTIVITIES"
    OTHER = "OTHER"


class ReportStatus:
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"