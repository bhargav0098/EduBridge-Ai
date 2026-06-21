import os
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "edubridge.log")

    # Define standard format
    log_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    
    # Configure root logger
    root_logger = logging.getLogger()
    
    # Avoid duplicate handlers if already configured
    if not root_logger.handlers:
        root_logger.setLevel(logging.INFO)

        # Rotating File Handler (max 5MB per file, keeping 3 backups)
        file_handler = RotatingFileHandler(
            log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(logging.Formatter(log_format))
        file_handler.setLevel(logging.INFO)
        root_logger.addHandler(file_handler)

        # Console Handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(log_format))
        console_handler.setLevel(logging.INFO)
        root_logger.addHandler(console_handler)

        logging.info("Logging system initialized successfully. Log file: %s", log_file)
