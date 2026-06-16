import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { RegisterForm } from '@/pages/Auth/RegisterForm';
import { Microphone } from '@/pages/LandingPage/Microphone';
import { TreeWallpaper } from '@/wallpapers/TreeWallpaper';
import { supabase } from '@/shared/lib/supabase';
import { GradientQrCode } from '@/shared/GradientQrCode';
import { QrScannerModal } from '@/shared/QrScannerModal';

const DITHER_NOISE =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E";

const SCRIM_MASK = `radial-gradient(
  closest-side,
  rgba(0,0,0,1) 0%,
  rgba(0,0,0,0.738) 19%,
  rgba(0,0,0,0.541) 34%,
  rgba(0,0,0,0.382) 47%,
  rgba(0,0,0,0.278) 56.5%,
  rgba(0,0,0,0.194) 65%,
  rgba(0,0,0,0.126) 73%,
  rgba(0,0,0,0.075) 80.2%,
  rgba(0,0,0,0.042) 86.1%,
  rgba(0,0,0,0.021) 91%,
  rgba(0,0,0,0.008) 95.2%,
  rgba(0,0,0,0.002) 98.2%,
  transparent 100%
)`;

export const AuthPage = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const translateX = useTransform(mouseX, [-1, 1], [20, -20]);
  const translateY = useTransform(mouseY, [-1, 1], [20, -20]);

  const springConfig = { damping: 30, stiffness: 50, mass: 0.5 };
  const springX = useSpring(translateX, springConfig);
  const springY = useSpring(translateY, springConfig);

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isPhoneScannerOpen, setIsPhoneScannerOpen] = useState(false);

  useEffect(() => {
    const hasMouse = window.matchMedia('(pointer: fine)').matches;
    if (!hasMouse) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    // 🔥 БОНУС: Если отсканировали штатной камерой телефона, он сам откроет этот URL
    // Мы ловим его и автоматически перенаправляем на авторизацию
    const params = new URLSearchParams(window.location.search);
    const phoneLoginToken = params.get('phone_login');

    if (phoneLoginToken) {
      supabase
        .from('qr_auth_sessions')
        .select('status, action_link')
        .eq('id', phoneLoginToken)
        .single()
        .then(({ data }) => {
          if (data?.status === 'approved' && data.action_link) {
            window.location.href = data.action_link;
          }
        });
    }

    const token = crypto.randomUUID();
    setQrToken(token);

    supabase.from('qr_auth_sessions').insert({ id: token }).then();

    const channel = supabase
      .channel(`qr_session_${token}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'qr_auth_sessions', filter: `id=eq.${token}` },
        (payload) => {
          if (payload.new.status === 'approved' && payload.new.action_link) {
            window.location.href = payload.new.action_link;
          }
        },
      )
      .subscribe();

    const fallbackInterval = setInterval(async () => {
      const { data } = await supabase
        .from('qr_auth_sessions')
        .select('status, action_link')
        .eq('id', token)
        .single();

      if (data && data.status === 'approved' && data.action_link) {
        window.location.href = data.action_link;
      }
    }, 3000);

    return () => {
      channel.unsubscribe();
      clearInterval(fallbackInterval);
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden bg-background font-sans text-text">
      {/* ФОНЫ... */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div
          className="absolute top-0 right-0 size-[800px] translate-x-1/2 -translate-y-1/2 transform-gpu rounded-full bg-primary will-change-[background-color] md:size-[1000px]"
          style={{
            maskImage: SCRIM_MASK,
            WebkitMaskImage: SCRIM_MASK,
            opacity: 'var(--glow-opacity)',
            mixBlendMode: 'var(--glow-blend)' as any,
          }}
        />
        <div
          className="absolute right-0 bottom-0 size-[1000px] translate-x-1/2 translate-y-1/2 transform-gpu rounded-full bg-primary will-change-[background-color] md:size-[1200px]"
          style={{
            maskImage: SCRIM_MASK,
            WebkitMaskImage: SCRIM_MASK,
            opacity: 'var(--glow-opacity)',
            mixBlendMode: 'var(--glow-blend)' as any,
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <motion.div style={{ x: springX, y: springY }} className="absolute h-[105%] w-[105%]">
          <TreeWallpaper className="h-full w-full scale-x-[-1] object-cover text-text opacity-[0.03]" />
        </motion.div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.06] sm:opacity-[0.04]"
        style={{
          backgroundImage: `url("${DITHER_NOISE}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          imageRendering: 'pixelated',
        }}
      />

      <div className="relative z-20 flex w-full flex-col bg-surface p-6 sm:p-12 md:w-[480px] xl:w-[540px]">
        <RegisterForm onOpenQrScanner={() => setIsPhoneScannerOpen(true)} />
      </div>

      <div className="relative z-10 hidden flex-1 items-center justify-center overflow-hidden md:flex">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 flex flex-col items-center justify-center rounded-[32px] bg-surface/80 p-8 text-center backdrop-blur-xl"
        >
          <h2 className="mb-2 text-2xl font-semibold text-text">Вход по QR-коду</h2>
          <p className="mb-8 max-w-[280px] text-sm text-text/60">
            Откройте сканер в <span className="font-semibold text-text"> настройках</span> на уже
            зарегистрированном аккаунте на телефоне, чтобы моментально войти.
          </p>

          <GradientQrCode
            value={qrToken ? `${window.location.origin}/app?login_token=${qrToken}` : null}
            size={220}
          />
        </motion.div>

        <div className="pointer-events-none absolute right-0 bottom-0 z-10 w-120 max-w-[400px] translate-x-[15%] translate-y-[10%] opacity-70 xl:max-w-[700px]">
          <Microphone className="h-auto w-full text-primary" />
        </div>
      </div>

      {/* Модалка сканера для мобильного интерфейса */}
      <QrScannerModal isOpen={isPhoneScannerOpen} onClose={() => setIsPhoneScannerOpen(false)} />
    </div>
  );
};
