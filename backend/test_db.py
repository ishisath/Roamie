import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

url = os.getenv("DATABASE_URL_DIRECT")
print("URL loaded?", url is not None)

engine = create_engine(url)

with engine.connect() as conn:
    result = conn.execute(text("SELECT version()"))
    print("CONNECTED:", result.scalar())