# Market correction alerts

The alert engine runs on GitHub Actions every 15 minutes on weekdays. It fetches quotes server-side, evaluates all correction conditions, and sends one alert when the pattern becomes active. It sends one recovery message when the pattern clears.

## Correction conditions

Every condition must be true:

- XLP/SPY daily change is greater than 0%
- XLU daily change is greater than 0%
- XLY/XLP daily change is less than 0%
- RSP daily change is less than 0%
- VIX daily change is greater than 0%
- S5FI is below 50%

These are semantic rules. A green pill means the condition is favorable to the correction signal; it does not mean the underlying asset always rose.

## GitHub secrets

Add these under **Repository Settings > Secrets and variables > Actions > New repository secret**. Add only the channels you need.

Telegram:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

SMS through Twilio:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM`
- `SMS_TO`

WhatsApp Cloud API:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TO`

If no complete channel credentials are present, the workflow performs the market check and logs that no configured channel was available. It never prints secret values.

## Run manually

Open the repository Actions tab, select **Market correction alert**, choose **Run workflow**, and run it on `main`.
