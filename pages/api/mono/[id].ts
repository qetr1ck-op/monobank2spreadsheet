import { dbClient } from '@/services/db';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<string>) {
  const { id } = req.query;

  console.log(id);

  const item = await dbClient.get(id as string);

  if (!item) {
    return res.status(404).send('Not Found');
  }

  res.status(200).json(JSON.parse(item));
}
