'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { BookingForm } from '@/components/booking-form';
import { SiteHeader } from '@/components/site-header';

const PRICE_IMAGE_SRC = '/price-services.jpg';

export default function Home() {
  const [isPriceOpen, setIsPriceOpen] = useState(false);

  useEffect(() => {
    if (!isPriceOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPriceOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPriceOpen]);

  function scrollToBookingSection() {
    const bookingSection = document.getElementById('booking');

    bookingSection?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-[-12%] top-[-16rem] h-[38rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),rgba(255,255,255,0.24)_38%,transparent_78%)] blur-2xl" />
      <div className="pointer-events-none absolute left-[-8rem] top-[18rem] h-[20rem] w-[20rem] rounded-full bg-[#f2cfbe]/30 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-8rem] top-[22rem] h-[22rem] w-[22rem] rounded-full bg-[#ddd0e3]/24 blur-[130px]" />
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8">
        <section className="w-full">
          <div className="relative overflow-hidden rounded-[36px] bg-[#171515] shadow-[0_28px_90px_rgba(15,10,10,0.24)]">
            <Image
              src="/Frame%2042.png"
              alt="Онлайн-запись на маникюр"
              width={862}
              height={524}
              priority
              className="h-auto w-full object-cover"
            />
            <div className="absolute left-[11.5%] top-[24%] z-10 flex flex-col gap-3 md:left-[12.5%] md:top-[23%] md:gap-9 lg:left-[11.5%] lg:top-[22%]">
              <button
                type="button"
                onClick={scrollToBookingSection}
                className="flex h-[30px] w-[102px] items-center justify-center whitespace-nowrap rounded-full bg-[#ff929b] px-3 text-[#201514] shadow-[0_8px_16px_rgba(255,146,155,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ff9ea7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 md:h-[62px] md:w-[220px] md:px-6 md:shadow-[0_16px_30px_rgba(255,146,155,0.24)] lg:h-[70px] lg:w-[270px]"
                style={{ lineHeight: 1 }}
              >
                <span className="block text-[0.6rem] font-normal tracking-[-0.04em] md:text-[1.5rem] md:font-normal lg:text-[1.65rem]">
                онлайн запись
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsPriceOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isPriceOpen}
                className="flex h-[30px] w-[102px] items-center justify-center rounded-full bg-[#d9d9db] px-3 text-[#ff7893] shadow-[0_8px_16px_rgba(255,255,255,0.14)] transition hover:-translate-y-0.5 hover:bg-[#e7e7e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 md:h-[62px] md:w-[220px] md:px-6 md:shadow-[0_16px_30px_rgba(255,255,255,0.18)] lg:h-[70px] lg:w-[270px]"
              >
                <span className="block origin-center text-[0.98rem] font-semibold leading-none tracking-[-0.04em] scale-100 md:text-[1.7rem] md:scale-[1.55] lg:text-[1.85rem] lg:scale-[1.62]">
                  Price
                </span>
              </button>
            </div>
          </div>
          <div className="relative z-10 mt-[-24px] w-full sm:mt-[-56px]">
            <BookingForm />
          </div>
        </section>
      </main>

      {isPriceOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm sm:p-6"
          onClick={() => setIsPriceOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Прайс услуг"
            className="relative w-full max-w-[760px]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsPriceOpen(false)}
              aria-label="Закрыть прайс"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#171515]/88 text-2xl leading-none text-white shadow-[0_16px_30px_rgba(0,0,0,0.3)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
            >
              ×
            </button>
            <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
              <Image
                src={PRICE_IMAGE_SRC}
                alt="Прайс услуг"
                width={720}
                height={1041}
                className="h-auto max-h-[85vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
