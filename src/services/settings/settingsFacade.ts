/**
 * settingsFacade.ts - Facade re-exports of settings types for component-layer use.
 * Components must not import from @/core directly (layering rule); route type
 * imports through this service facade instead.
 */

export type {
  NotificationSettings,
  RivalMilestoneAlertSettings,
} from "@/core/settings/settingsTypes";
