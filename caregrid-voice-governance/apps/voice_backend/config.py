from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "CareGrid Voice Gateway"
    port: int = 8010
    log_level: str = "INFO"

    azure_speech_key: str = ""
    azure_speech_region: str = "eastus"
    azure_speech_language: str = "en-US"

    azure_openai_endpoint: str = ""
    azure_openai_key: str = ""
    azure_openai_deployment: str = "gpt-4o-mini"

    acs_connection_string: str = ""
    acs_phone_number: str = ""

    redis_connection_string: str = ""
    cosmos_connection_string: str = ""
    key_vault_uri: str = ""

    cloud_mode: str = "speech_cascade"
    allow_demo_mode: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
