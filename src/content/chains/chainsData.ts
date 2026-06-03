import { Cat, Wind, Waveform, MusicNotes, type IconProps } from '@phosphor-icons/react';

export interface ChainConfig {
  id: string;
  title: string;
  mdxPath: string;
  icon?: React.FC<IconProps>;
}

export const chainsConfig: ChainConfig[] = [
  {
    id: 'chain1',
    title: 'Подготовка тела',
    mdxPath: '/src/content/chains/bodyChain.md',
    icon: Cat,
  },
  {
    id: 'chain2',
    title: 'Работа с диафрагмой',
    mdxPath: '/src/content/chains/breathChain.md',
    icon: Wind,
  },
  {
    id: 'chain3',
    title: 'Разогрев связок',
    mdxPath: '/src/content/chains/warmingChain.md',
    icon: Waveform,
  },
    {
    id: 'chain4',
    title: 'Артикуляция',
    mdxPath: '/src/content/chains/articulationChain.md',
    icon: MusicNotes,
  },
      {
    id: 'chain5',
    title: 'Расширение диапазона',
    mdxPath: '/src/content/chains/rangeChain.md',
    icon: MusicNotes,
  },
  {
    id: 'chain6',
    title: 'Переход к песне',
    mdxPath: '/src/content/chains/accessChain.md',
    icon: MusicNotes,
  },
];