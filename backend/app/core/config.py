from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")
    app_env: str = "development"
    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_name: str = "it_asset_invenotry"
    db_user: str
    db_password: str
    session_secret: str
    frontend_origin: str = "http://localhost:5173"
    max_upload_size_mb: int = 5
    session_max_age: int = 8 * 3600

settings = Settings()
