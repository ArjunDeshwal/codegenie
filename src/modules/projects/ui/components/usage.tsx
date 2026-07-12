import { useAuth } from '@clerk/nextjs';
import { CrownIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface UsageProps {
  points: number;
  msBeforeNext: number;
}

const Usage = ({ points }: UsageProps) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: 'pro' });

  return (
    <div className="mb-2 flex items-center px-1">
      <div className="flex items-center gap-x-2">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {points} {hasProAccess ? '' : 'free'} credits available
          </p>
        </div>

        {!hasProAccess && (
          <Button asChild size="xs" variant="ghost" className="h-6 text-[10px] text-primary">
            <Link href="/pricing">
              <CrownIcon className="size-3" /> Upgrade
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export { Usage };
