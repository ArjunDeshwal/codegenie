import { serve } from 'inngest/next';

import { codeAgentFunction } from '@/inngest/functions';
import { inngest } from '../../../inngest/client';

// Give code-generation steps the longest window supported by the host's plan.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [codeAgentFunction],
});
