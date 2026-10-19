import {
  Award,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Bookmark,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarClock,
  ClipboardList,
  Compass,
  Crown,
  DollarSign,
  Egg,
  Eye,
  Film,
  Flag,
  Gavel,
  Globe,
  Heart,
  Home,
  Landmark,
  LayoutGrid,
  ListOrdered,
  Map,
  Medal,
  Newspaper,
  Scale,
  Scroll,
  Settings,
  Sparkles,
  Stethoscope,
  Store,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
} from "lucide-react";
import type { NavItem } from "@/domains/shell/ui/NavSection";

/**
 * Primary navigation model — three sections, eleven items.
 * Everything else lives in the `moreNavGroup` disclosure so the sidebar stays
 * scannable while every route remains reachable. Folded narrative routes
 * (/gazette, /recap, /races, /race-browser) redirect to hub tabs and are
 * intentionally absent here.
 */
export const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Stable",
    items: [
      { to: "/", label: "Dashboard", icon: Home, exact: true },
      { to: "/stable", label: "Stable", icon: Trophy, exact: false },
      { to: "/breeding", label: "Breeding", icon: Heart, exact: false },
      { to: "/briefing", label: "Briefing", icon: Newspaper, exact: false },
      { to: "/inbox", label: "Inbox", icon: Bell, exact: false },
    ],
  },
  {
    label: "Racing",
    items: [
      { to: "/racing", label: "Race Center", icon: Flag, exact: false },
      { to: "/calendar", label: "Calendar", icon: Calendar, exact: false },
      { to: "/replays", label: "Replays", icon: Film, exact: false },
    ],
  },
  {
    label: "Market",
    items: [
      { to: "/auction", label: "Auction", icon: Gavel, exact: false },
      { to: "/market", label: "Market", icon: Store, exact: false },
      { to: "/portfolio", label: "Portfolio", icon: Briefcase, exact: false },
    ],
  },
] as const;

/** Secondary routes grouped under the expandable "More" disclosure. */
export const moreNavGroup: { label: string; items: NavItem[] } = {
  label: "More",
  items: [
    { to: "/analytics", label: "Analytics", icon: BarChart3, exact: false },
    { to: "/financial-report", label: "Finances", icon: DollarSign, exact: false },
    { to: "/bookmarks", label: "Bookmarks", icon: Bookmark, exact: false },
    { to: "/horse-gallery", label: "Horse Gallery", icon: LayoutGrid, exact: false },
    { to: "/broodmares", label: "Broodmares", icon: Egg, exact: false },
    { to: "/stallions", label: "Stallions", icon: Crown, exact: false },
    { to: "/sire-watch", label: "Sire Watch", icon: Eye, exact: false },
    { to: "/sire-leaderboards", label: "Sire Leaderboards", icon: Medal, exact: false },
    { to: "/syndicate-stakes", label: "Syndicate Stakes", icon: Sparkles, exact: false },
    { to: "/staff", label: "Staff", icon: Users, exact: false },
    { to: "/jockeys", label: "Jockeys", icon: User, exact: false },
    { to: "/race-advisor", label: "Race Advisor", icon: Compass, exact: false },
    { to: "/stableCampaign", label: "Stable Campaign", icon: Target, exact: false },
    { to: "/strategyJournal", label: "Strategy Journal", icon: BookMarked, exact: false },
    { to: "/dailyPlans", label: "Daily Plans", icon: ClipboardList, exact: false },
    { to: "/facilities", label: "Facilities", icon: Building2, exact: false },
    { to: "/vet", label: "Vet Report", icon: Stethoscope, exact: false },
    { to: "/stewards", label: "Stewards", icon: Scale, exact: false },
    { to: "/honors", label: "Honors", icon: Award, exact: false },
    { to: "/hall-of-fame", label: "Hall of Fame", icon: Landmark, exact: false },
    { to: "/awards", label: "Awards", icon: Medal, exact: false },
    { to: "/records", label: "Records", icon: Scroll, exact: false },
    { to: "/rankings-history", label: "Rankings History", icon: TrendingUp, exact: false },
    { to: "/stable-rankings", label: "Stable Rankings", icon: ListOrdered, exact: false },
    { to: "/almanac", label: "Almanac", icon: BookOpen, exact: false },
    { to: "/track-history", label: "Course Histories", icon: Map, exact: false },
    { to: "/regional-comparison", label: "Regional Comparison", icon: Globe, exact: false },
    { to: "/npc-stables", label: "NPC Stables", icon: Building, exact: false },
    { to: "/npc-stables/rival-careers", label: "Rival Careers", icon: Swords, exact: false },
    { to: "/scheduler", label: "Scheduler", icon: CalendarClock, exact: false },
    { to: "/settings", label: "Settings", icon: Settings, exact: false },
  ],
};
