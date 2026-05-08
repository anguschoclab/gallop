import { createFileRoute } from '@tanstack/react-router';
import { RecordsDashboard } from '@/components/history/RecordsDashboard';

export const Route = createFileRoute('/records')({
  component: RecordsDashboard,
});
