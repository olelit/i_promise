export interface TelegramWebAppUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  is_premium?: boolean
}

export interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
}

export interface TelegramMainButton {
  text: string
  isVisible: boolean
  show(): void
  hide(): void
  setText(text: string): void
  enable(): void
  disable(): void
  showProgress(leaveActive?: boolean): void
  hideProgress(): void
  onClick(handler: () => void): void
  offClick(handler: () => void): void
}

export interface TelegramBackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(handler: () => void): void
  offClick(handler: () => void): void
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramWebAppUser
    query_id?: string
    auth_date?: number
    hash?: string
  }
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  viewportHeight: number
  viewportStableHeight: number
  isExpanded: boolean
  version: string
  platform: string
  ready(): void
  expand(): void
  close(): void
  onEvent(event: string, handler: () => void): void
  offEvent(event: string, handler: () => void): void
  MainButton: TelegramMainButton
  BackButton: TelegramBackButton
  HapticFeedback: TelegramHapticFeedback
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export const mockUser: TelegramWebAppUser = {
  id: 1,
  first_name: 'Test',
  last_name: 'User',
  username: 'test_user',
  language_code: 'en',
  is_premium: false,
}

export function getWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp
}
