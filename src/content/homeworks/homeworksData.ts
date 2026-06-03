
export interface HomeworkConfig {
  id: string;
  title: string;
  mdxPath: string;
}

export const homeworksConfig: Record<string, HomeworkConfig> = {
  // Урок 1
  hw_intro_1: { id: 'hw_intro_1', title: 'Дыхание "Насос"', mdxPath: '/src/content/homeworks/l1/pumpHomework1.md' },
  hw_intro_2: { id: 'hw_intro_2', title: 'Детектив', mdxPath: '/src/content/homeworks/l1/detectiveHomework2.md' },
  hw_intro_3: { id: 'hw_intro_3', title: 'Свободная челюсть', mdxPath: '/src/content/homeworks/l1/freedomJawHomework3.md' },

  // Урок 2
  hw_body_1: { id: 'hw_body_1', title: 'Тряпичная кукла', mdxPath: '/src/content/homeworks/l2/dollHomework1.md' },
  hw_body_2: { id: 'hw_body_2', title: 'Сброс груза', mdxPath: '/src/content/homeworks/l2/cargoHomework2.md' },
  hw_body_3: { id: 'hw_body_3', title: 'Сонное лицо', mdxPath: '/src/content/homeworks/l2/faceHomework3.md' },

// Урок 3
  hw_breath_1: { id: 'hw_breath_1', title: 'Собачка', mdxPath: '/src/content/homeworks/l3/dogHomework1.md' },
  hw_breath_2: { id: 'hw_breath_2', title: 'Проколотая шина', mdxPath: '/src/content/homeworks/l3/tireHomework.md' },
  hw_breath_3: { id: 'hw_breath_3', title: 'Зов через улицу', mdxPath: '/src/content/homeworks/l3/callHomework.md' },

  // Урок 4
  hw_lip_1: { id: 'hw_lip_1', title: 'Моторчик', mdxPath: '/src/content/homeworks/l4/motorHomework1.md' },
  hw_lip_2: { id: 'hw_lip_2', title: 'Полицейская сирена', mdxPath: '/src/content/homeworks/l4/policeHomework2.md' },
  
   // Урок 5
  hw_beat_1: { id: 'hw_beat_1', title: 'Следи за барабаном', mdxPath: '/src/content/homeworks/l5/drumsHomework1.md' },
  hw_beat_2: { id: 'hw_beat_2', title: 'Шаг и счет', mdxPath: '/src/content/homeworks/l5/scoreHomework2.md' },
  hw_beat_3: { id: 'hw_beat_3', title: 'Шаг в пустоту', mdxPath: '/src/content/homeworks/l5/emptinessHomework3.md' },
  hw_beat_4: { id: 'hw_beat_4', title: 'Ритмический вдох', mdxPath: '/src/content/homeworks/l5/inhaleHomework4.md' },
  hw_beat_5: { id: 'hw_beat_5', title: 'Скандирование на одной ноте', mdxPath: '/src/content/homeworks/l5/scandirovanieHomework5.md' },

   // Урок 6
  hw_not_1: { id: 'hw_not_1', title: 'Система координат', mdxPath: '/src/content/homeworks/l6/coordsHomework1.md' },
  hw_not_2: { id: 'hw_not_2', title: 'Собери нотный стан', mdxPath: '/src/content/homeworks/l6/gammaHomework2.md' },
  hw_not_3: { id: 'hw_not_3', title: 'Ритмический пульс', mdxPath: '/src/content/homeworks/l6/pulseHomework3.md' },

   // Урок 7
  hw_register_1: { id: 'hw_register_1', title: 'Скрипучая дверь', mdxPath: '/src/content/homeworks/l7/doorHomework1.md' },
  hw_register_2: { id: 'hw_register_2', title: 'Сирена', mdxPath: '/src/content/homeworks/l7/buzzerHomework2.md' },
  hw_register_3: { id: 'hw_register_3', title: 'Тумблер', mdxPath: '/src/content/homeworks/l7/tumblerHomework3.md' },
  hw_register_4: { id: 'hw_register_4', title: 'Контролируемый срыв', mdxPath: '/src/content/homeworks/l7/breakdownHomework4.md' },
  hw_register_5: { id: 'hw_register_5', title: 'Поиск Анкера', mdxPath: '/src/content/homeworks/l7/ankerHomework5.md' },

     // Урок 8
  hw_un_1: { id: 'hw_un_1', title: 'Бытовой унисон', mdxPath: '/src/content/homeworks/l8/everydayHomework1.md' },
  hw_un_2: { id: 'hw_un_2', title: 'Нотная уборка', mdxPath: '/src/content/homeworks/l8/cleanHomework2.md' },

   // Урок 9
  hw_int_1: { id: 'hw_int_1', title: 'Радар настроения', mdxPath: '/src/content/homeworks/l9/radarMoodHomework1.md' },
  hw_int_2: { id: 'hw_int_2', title: 'Звуковая рулетка', mdxPath: '/src/content/homeworks/l9/rouletteHomework2.md' },
  hw_int_3: { id: 'hw_int_3', title: 'Интервальный тир', mdxPath: '/src/content/homeworks/l9/tirHomework3.md' },
  hw_int_4: { id: 'hw_int_4', title: 'Ртутные капли', mdxPath: '/src/content/homeworks/l9/dropHomework4.md' },
  hw_int_5: { id: 'hw_int_5', title: 'Построение снеговиков', mdxPath: '/src/content/homeworks/l9/snowmanHomework5.md' },
  hw_int_6: { id: 'hw_int_6', title: 'Чувство тональности', mdxPath: '/src/content/homeworks/l9/tonicHomework6.md' },
  hw_int_7: { id: 'hw_int_7', title: 'Внутреннее радио', mdxPath: '/src/content/homeworks/l9/radioHomework7.md' },
  hw_int_8: { id: 'hw_int_8', title: 'Первый «полигон»', mdxPath: '/src/content/homeworks/l9/polygonHomework8.md' },

   // Урок 10
  hw_art_1: { id: 'hw_art_1', title: 'Правило переноса', mdxPath: '/src/content/homeworks/l10/transferRuleHomework1.md' },
  hw_art_2: { id: 'hw_art_2', title: 'Спящий пассажир', mdxPath: '/src/content/homeworks/l10/sleepingPassengerHomework2.md' },
  hw_art_3: { id: 'hw_art_3', title: 'Правило хвоста', mdxPath: '/src/content/homeworks/l10/tailRuleHomework3.md' },
  hw_art_4: { id: 'hw_art_4', title: 'Скороговорка с акцентом', mdxPath: '/src/content/homeworks/l10/patterHomework4.md' },
  hw_art_5: { id: 'hw_art_5', title: 'Однотонные гласные', mdxPath: '/src/content/homeworks/l10/monophonicVowelsHomework5.md' },
  hw_art_6: { id: 'hw_art_6', title: 'Горячая картошка', mdxPath: '/src/content/homeworks/l10/hotPotatoHomework6.md' },
  hw_art_7: { id: 'hw_art_7', title: 'Фитнес для губ', mdxPath: '/src/content/homeworks/l10/fitnessLipsHomework7.md' },
  hw_art_8: { id: 'hw_art_8', title: 'Независимый язык', mdxPath: '/src/content/homeworks/l10/independenceLanguageHomework8.md' },  
  hw_art_9: { id: 'hw_art_9', title: 'Битбоксер', mdxPath: '/src/content/homeworks/l10/beatboxerHomework9.md' },

   // Урок 11
  hw_regime_1: { id: 'hw_regime_1', title: 'Воздушный клапан', mdxPath: '/src/content/homeworks/l11/airValveHomework1.md' },
  hw_regime_2: { id: 'hw_regime_2', title: 'Динамическая волна', mdxPath: '/src/content/homeworks/l11/dynamicWaveHomework2.md' },
  hw_regime_3: { id: 'hw_regime_3', title: 'Открытие гласных', mdxPath: '/src/content/homeworks/l11/openingVowelsHomework3.md' },
  hw_regime_4: { id: 'hw_regime_4', title: 'Вокальная анатомия', mdxPath: '/src/content/homeworks/l11/vocalAnatomyHomework4.md' },
  hw_regime_5: { id: 'hw_regime_5', title: 'Вокальная раскраска', mdxPath: '/src/content/homeworks/l11/regimeHomework5.md' },

   // Урок 12
  hw_decor_1: { id: 'hw_decor_1', title: 'Подчинение волны', mdxPath: '/src/content/homeworks/l12/submittingWaveHomework1.md' },
  hw_decor_2: { id: 'hw_decor_2', title: 'Копирование по частям', mdxPath: '/src/content/homeworks/l12/copyPartHomework2.md' },
  hw_decor_3: { id: 'hw_decor_3', title: 'Вертолет', mdxPath: '/src/content/homeworks/l12/helicopterHomework3.md' },
  hw_decor_4: { id: 'hw_decor_4', title: 'Дизайнер звука', mdxPath: '/src/content/homeworks/l12/designerHomework4.md' },

   // Урок 13
  hw_split_1: { id: 'hw_split_1', title: 'Поиск ложных связок', mdxPath: '/src/content/homeworks/l13/searchFalseConnectionsHomework1.md' },

   // Урок 14
  hw_phras_1: { id: 'hw_phras_1', title: 'Смещение акцента', mdxPath: '/src/content/homeworks/l14/offsetAccentHomework1.md' },
  hw_phras_2: { id: 'hw_phras_2', title: 'Одна фраза — пять настроений', mdxPath: '/src/content/homeworks/l14/differentMoodsHomework2.md' },
  hw_phras_3: { id: 'hw_phras_3', title: 'Режиссер', mdxPath: '/src/content/homeworks/l14/directorHomework3.md' },

   // Урок 15
  hw_din_1: { id: 'hw_din_1', title: 'Карта динамики', mdxPath: '/src/content/homeworks/l15/dynamicMapHomework1.md' },
  hw_din_2: { id: 'hw_din_2', title: 'Самолёт', mdxPath: '/src/content/homeworks/l15/planeHomework2.md' },
  hw_din_3: { id: 'hw_din_3', title: 'В тихом омуте', mdxPath: '/src/content/homeworks/l15/poolHomework3.md' },

   // Урок 16
  hw_story_1: { id: 'hw_story_1', title: 'Чтец', mdxPath: '/src/content/homeworks/l16/writterHomework1.md' },
  hw_story_2: { id: 'hw_story_2', title: 'Внутреннее кино', mdxPath: '/src/content/homeworks/l16/filmHomework2.md' },

   // Урок 17
  hw_micro_1: { id: 'hw_micro_1', title: 'Разговор свечи', mdxPath: '/src/content/homeworks/l17/fireHomework1.md' },
  hw_micro_2: { id: 'hw_micro_2', title: 'Практика у зеркала', mdxPath: '/src/content/homeworks/l17/mirrorPracticeHomework2.md' },
}