from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_name: str = "CareGrid Voice Gateway"
    port: int = 8010
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:5173,http://localhost:8787"

    azure_speech_key: str = ""
    azure_speech_region: str = "eastus"
    azure_speech_language: str = "en-US"
    azure_speech_voice: str = "en-US-AvaNeural"

    azure_openai_endpoint: str = ""
    azure_openai_key: str = ""
    azure_openai_deployment: str = "gpt-4o-mini"
    azure_openai_api_version: str = "2024-10-21"

    acs_connection_string: str = ""
    acs_phone_number: str = ""
    public_base_url: str = ""

    redis_connection_string: str = ""
    cosmos_connection_string: str = ""
    key_vault_uri: str = ""
    applicationinsights_connection_string: str = ""

    cloud_mode: str = "speech_cascade"
    allow_demo_mode: bool = True

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


settings = Settings()
