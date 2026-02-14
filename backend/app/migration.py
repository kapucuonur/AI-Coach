
from sqlalchemy import text
from app.database import engine
import logging

logger = logging.getLogger(__name__)

def migrate_db():
    """
    Checks for missing columns (garmin_email, garmin_password) in 'users' table 
    and adds them if they don't exist.
    Essential for updating the production DB without a full migration tool.
    """
    try:
        with engine.connect() as connection:
            # Check for garmin_email
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='garmin_email'"
            ))
            if not result.fetchone():
                logger.info("Adding 'garmin_email' column to users table...")
                connection.execute(text("ALTER TABLE users ADD COLUMN garmin_email VARCHAR(255)"))
            
            # Check for garmin_password
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='garmin_password'"
            ))
            if not result.fetchone():
                logger.info("Adding 'garmin_password' column to users table...")
                connection.execute(text("ALTER TABLE users ADD COLUMN garmin_password VARCHAR(500)"))
            
            connection.commit()
            logger.info("Database schema migration check complete.")
    except Exception as e:
        logger.error(f"Migration failed: {e}")
