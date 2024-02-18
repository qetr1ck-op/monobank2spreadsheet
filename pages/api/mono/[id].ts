import { dbClient } from '@/services/db';
import { googleSheet } from '@/services/google-sheet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<string>) {
  const { id } = req.query;

  const item = await dbClient.get(id as string);

  if (!item) {
    return res.status(404).send('Not Found');
  }

  try {
    await googleSheet.load();
    await googleSheet.sheet.addRow(JSON.parse(item));
    await dbClient.del(id as string);
  } catch (error) {
    res.status(500).send(`Internal Server Error: ${error}`);
  }

  res.status(200).json(JSON.parse(item));
}
