import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'race-condition-tool-secret'
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'race_conditions.db'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size