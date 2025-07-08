
import { messageRouter } from '@/modules/messages/server/procedure';
import {  createTRPCRouter } from '../init';

export const appRouter = createTRPCRouter({
  message:messageRouter,
  
});
// export type definition of API
export type AppRouter = typeof appRouter;