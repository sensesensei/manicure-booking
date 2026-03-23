const CHANNEL_URL = "https://t.me/nailsss_21";
const PROFILE_URL = "https://t.me/agxvjo";

function TelegramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
    >
      <path d="M19.777 4.43a1.5 1.5 0 0 1 2.03 1.697l-2.842 13.41a1.5 1.5 0 0 1-2.184 1.01l-4.173-2.308-2.127 2.05a1.5 1.5 0 0 1-2.535-.91l-.394-3.903L4.48 13.92a1.5 1.5 0 0 1 .143-2.8Zm-9.47 10.43.16 1.573 1.027-.99a1.5 1.5 0 0 1 1.767-.23l3.31 1.83 2.13-10.05-11.24 4.91 1.96 1.084a1.5 1.5 0 0 1 .89 1.872Z" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 rounded-[28px] border border-black/5 bg-white/90 px-4 py-3 shadow-[0_18px_45px_rgba(32,17,13,0.08)] backdrop-blur sm:px-5">
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex min-w-0 items-center gap-3 rounded-full pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd7dc,#f4b9c3_48%,#d39ca6_100%)] text-[10px] font-semibold uppercase tracking-[0.22em] text-white shadow-[inset_0_1px_3px_rgba(255,255,255,0.55)]">
            photo
          </span>
          <span className="truncate text-lg text-foreground transition group-hover:text-accent">
            nailsss_21
          </span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-2 py-1 text-base text-foreground transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:text-lg"
          >
            @agxvjo
          </a>
          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Telegram profile @agxvjo"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#161212] text-white shadow-[0_12px_20px_rgba(22,18,18,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 hover:-translate-y-0.5 hover:bg-[#2b211f]"
          >
            <TelegramIcon />
          </a>
        </div>
      </div>
    </header>
  );
}
