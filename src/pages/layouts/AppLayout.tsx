import { Outlet, NavLink } from 'react-router-dom';

export const AppLayout = () => {
	return (
		<div className='flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950'>
			{/* Боковая панель навигации */}
			<aside className='w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col'>
				<div className='h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-6'>
					<span className='font-bold text-lg'>My SaaS</span>
				</div>

				{/* Ссылки навигации */}
				<nav className='flex-1 p-4 space-y-1'>
					<NavLink
						to='/app/dashboard'
						className={({ isActive }) =>
							`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
								isActive
									? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
									: 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
							}`
						}
					>
						Дашборд
					</NavLink>
					<NavLink
						to='/app/settings'
						className={({ isActive }) =>
							`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
								isActive
									? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
									: 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
							}`
						}
					>
						Настройки
					</NavLink>
				</nav>

				<div className='p-4 border-t border-zinc-200 dark:border-zinc-800'>
					<NavLink to='/' className='text-sm text-zinc-500 hover:underline'>
						← На главную
					</NavLink>
				</div>
			</aside>

			{/* Основная рабочая область справа */}
			<main className='flex-1 flex flex-col overflow-y-auto'>
				{/* Шапка (опционально) */}
				<header className='h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur flex items-center px-8'>
					<h2 className='text-sm font-medium text-zinc-500'>Рабочая область</h2>
				</header>

				{/* Контент текущей страницы */}
				<div className='p-8 max-w-5xl w-full mx-auto'>
					<Outlet /> {/* <--- Сюда рендерятся страницы дашборда и настроек */}
				</div>
			</main>
		</div>
	);
};
