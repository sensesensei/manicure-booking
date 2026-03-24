# Telegram Setup

## 1. Create the bot

1. Open Telegram and start a chat with `@BotFather`.
2. Run `/newbot`.
3. Choose a display name and a bot username.
4. Copy the token and store it as `TELEGRAM_BOT_TOKEN`.

## 2. Prepare the target chat

For a direct chat:
1. Open your new bot.
2. Press `Start` or send any message to it.
3. This step is required before the bot can send messages back to you.

For a channel or group:
1. Add the bot to the chat.
2. Give it permission to post messages if needed.
3. Send at least one message in that chat so the bot can see an update.

## 3. Get `chat_id`

The simplest way is:

1. Send a message to the bot or into the target chat.
2. Open this URL in the browser:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

3. Find the `chat` object in the response.
4. Copy `chat.id` into `TELEGRAM_CHAT_ID`.

Notes:
- direct chats usually have a positive numeric id
- groups and channels often use a negative id
- if `getUpdates` is empty, send one more message and refresh

## 4. Add local env vars

Update `.env.local`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Then restart the local server.

## 5. Verify with a real booking flow

1. Open the landing page.
2. Create a test booking with valid contact data.
3. Check that the message appears in the target Telegram chat.
4. Open `/admin` and delete that test booking.
5. Check that the deletion message also appears in Telegram.

## 6. Common problems

- `chat not found`
  Usually the bot has never received a message from that chat, or `TELEGRAM_CHAT_ID` is wrong.
- `bot was blocked by the user`
  Unblock the bot in Telegram and retry.
- timeout or network error
  Retry once, then check internet access or Telegram availability.

## 7. Production checklist

- keep the bot token only in server-side env vars
- verify both booking creation and booking deletion notifications
