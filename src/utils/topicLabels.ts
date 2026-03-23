import React from 'react';
import { ForkKnife, FilmSlate, Television } from 'phosphor-react-native';
import { Topic } from '../providers/types';

export const topicDisplayNames: Record<Topic, string> = {
  food: 'Eat?',
  movie: 'Watch?',
  show: 'Stream?',
};

export const topicColors: Record<Topic, string> = {
  food: '#FF6B4A',
  movie: '#F5A623',
  show: '#7B68EE',
};

export const topicIcons: Record<Topic, React.ComponentType<any>> = {
  food: ForkKnife,
  movie: FilmSlate,
  show: Television,
};
