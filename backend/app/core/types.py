from sqlalchemy import TypeDecorator, String
import uuid


# UUID type that works with both SQLite and PostgreSQL
class GUID(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(value)
