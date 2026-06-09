import { useAuthStore } from '@/app/store/authStore';
import React from 'react';
import { Navigate } from 'react-router-dom';

const AuthLoader = () => {
  return (
    <div
      className="flex h-[100dvh] h-[100vh] w-screen flex-col items-center justify-center bg-[#0f0510]"
      style={{ perspective: '800px' }}
    >
      <style>{`
        @keyframes rotate-coin {
          0% {
            transform: rotateX(0deg) rotateY(0deg);
          }
          45% {
            transform: rotateX(70deg) rotateY(50deg);
          }
          50%,
          52% {
            transform: rotateX(75deg) rotateY(55deg);
          }
          100% {
            transform: rotateX(0deg) rotateY(0deg);
          }
        }
        .react-circle-loader {
          transform-origin: center;
          animation: rotate-coin 3s linear infinite;
          will-change: transform;
        }
      `}</style>
      <div className="flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 200 200"
          stroke="currentColor"
          className="h-[calc((1vh+1vw)*15)] w-[calc((1vh+1vw)*15)] text-[#10b981]"
        >
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            strokeWidth="4"
            className="react-circle-loader"
          />
        </svg>
      </div>
    </div>
  );
};

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return <AuthLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return <AuthLoader />;
  }

  if (user) {
    return <Navigate to="/app/tree" replace />;
  }

  return <>{children}</>;
};
