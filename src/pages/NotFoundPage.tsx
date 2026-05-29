export const NotFoundPage = () => {
  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center justify-center p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-normal tracking-wide text-text sm:text-2xl">Упс, нота мимо</h1>
        <p className="text-sm text-text/40 sm:text-base">Вы зашли на несуществующую страницу</p>
      </div>
    </div>
  );
};
