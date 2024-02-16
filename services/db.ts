import { createClient } from 'redis';

export const dbClient = await createClient({
  password: 'f1IiFj8Nvc9qMJn9yaR9Wn5slAlCTa32',
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
})
  .on('error', (err: unknown) => console.log('Redis Client Error', err))
  .connect();
