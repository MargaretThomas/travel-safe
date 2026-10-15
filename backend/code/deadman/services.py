"""Builds external-service adapters from settings. Missing credentials yield adapters
that fail loudly (status 'failed', reason 'channel_not_configured') instead of
pretending a notification was sent."""

from __future__ import annotations

import logging

from deadman.config import Settings, env_file_path
from deadman.geocoding import MapboxGeocoder, NullGeocoder, ReverseGeocoder
from deadman.notifications.dispatcher import Dispatcher
from deadman.notifications.providers import (
    EmailProvider,
    MessagingProvider,
    ResendEmailProvider,
    UnconfiguredEmailProvider,
    UnconfiguredMessagingProvider,
    WhatsAppBotMessagingProvider,
)

logger = logging.getLogger(__name__)


def build_email_provider(settings: Settings) -> EmailProvider:
    if settings.resend_api_key and settings.resend_from_email:
        return ResendEmailProvider(settings.resend_api_key, settings.resend_from_email)
    return UnconfiguredEmailProvider()


def build_messaging_provider(settings: Settings) -> MessagingProvider:
    if settings.whatsapp_bot_url:
        return WhatsAppBotMessagingProvider(settings.whatsapp_bot_url, settings.whatsapp_bot_token)
    # Otherwise every WhatsApp alert fails with channel_not_configured and the app's
    # test-alert button answers 503 "WhatsApp alerts are not set up on this server yet",
    # which reads like a gateway problem. Name the cause and the file to fix it in.
    logger.warning(
        "WHATSAPP_BOT_URL is not set: WhatsApp alerts will fail with channel_not_configured "
        "and the test-alert button will return 503. Set it in %s.",
        env_file_path(),
    )
    return UnconfiguredMessagingProvider()


def build_geocoder(settings: Settings) -> ReverseGeocoder:
    token = settings.mapbox_server_token or settings.mapbox_public_token
    return MapboxGeocoder(token) if token else NullGeocoder()


def build_dispatcher(settings: Settings) -> Dispatcher:
    return Dispatcher(settings, build_email_provider(settings), build_messaging_provider(settings))
