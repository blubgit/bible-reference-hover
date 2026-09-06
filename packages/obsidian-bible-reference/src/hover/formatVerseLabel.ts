import { IVerse } from '../interfaces/IVerse'

export const formatVerseLabel = (
  verse: Pick<IVerse, 'book_name' | 'chapter' | 'verse'>
): string => `${verse.book_name} ${verse.chapter}:${verse.verse}`
