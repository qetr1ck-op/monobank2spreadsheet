import { dbClient } from '@/services/db';
import { googleSheet } from '@/services/google-sheet';
import dayjs from 'dayjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export interface Transaction {
  id: string;
  date: string;
  time: string;
  monthIndex: number;
  amount: number;
  description: string;
  counterName: string;
  category: (typeof categories)[number];
}

// https://api.monobank.ua/docs/
export interface MonoTransactionRequest {
  type: string;
  data: {
    account: string;
    statementItem: MonoTransaction;
  };
}

export interface MonoTransaction {
  id: string;
  time: number;
  description: string;
  mcc: number;
  hold: boolean;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  counterName: string;
}

const isIncomingTransaction = (transaction: MonoTransaction): boolean => transaction.amount > 0;

const toTransactionDate = (date: Date): string => {
  return dayjs(date).format('DD.MM.YYYY');
};

const toTransactionTime = (date: Date): string => {
  return dayjs(date).format('hh:mm');
};

const toTransactionMonthIndex = (date: Date): number => {
  const monthIndex = date.getMonth();
  const leftPadIndex = 2;

  return leftPadIndex + monthIndex;
};

const toPrice = (amount: number): number => {
  return Math.abs(amount / 100);
};

const toDescription = (description: string): string => {
  return `🤖mono: ${description}`;
};

const toDateFromSeconds = (seconds: number): Date => {
  return new Date(seconds * 1000);
};

const categories = [
  '🍔 food',
  '🚘 car',
  '🏥 medical',
  '🏝️ travel',
  '🤵‍♂️ clothes orest',
  '🤵‍♀️ clothes olenka',
  '🎁 presents',
  '🏠 house',
  '🍴 restoran',
  '🐥 baby',
  '🐣 baby kindergarden',
  '🤹‍♂️ personal orest',
  '👰‍♀️ personal olenka',
  '⛽ petrol',
  '🪄 other',
  '🙌 charities',
  '📖 education',
] as const;

// TODO: load as external dependency (from gist, etc.)
const toCategory = (description: string): (typeof categories)[number] => {
  switch (true) {
    case description.includes('Епіцентр'):
    case description.includes('MEGOGO'):
    case description.includes('Нова пошта'):
    case description.includes('Netflix'):
    case description.includes('Охорона'):
    case description.includes('Холодна вода'):
    case description.includes('Електроенергія'):
    case description.includes('Опалення'):
    case description.includes('Гаряча вода'):
    case description.includes('JYSK'):
    case description.includes('Fotokhata'):
      return '🏠 house';
    case description.includes('Сину на машину'):
    case description.includes('Solidol Barbershop'):
    case description.includes('IQOS'):
    case description.includes('CHATGPT'):
    case description.includes('vapes'):
      return '🤹‍♂️ personal orest';
    case description.includes('AUTOPARTNER'):
    case description.includes('Yaremko'):
      return '🚘 car';
    case description.includes('Amic'):
    case description.includes('OKKO'):
      return '⛽ petrol';
    case description.includes('Znakhar'):
    case description.includes('Аптека'):
    case description.includes('Будемо Здорові Разом'):
    case description.includes('Apteka 3I'):
      return '🏥 medical';
    //Zadzerkalja
    case description.includes('Софія С.'):
      return '🐣 baby kindergarden';
    case description.includes('Будинок Іграшок'):
    case description.includes('PAPASHON'):
    case description.includes('MALIaTKO'):
    case description.includes('Чудо Острів'):
      return '🐥 baby';
    case description.includes('OSONNYA'):
      return '🏝️ travel';
    case description.includes('PAPASHON'):
    case description.includes('Остерія'):
    case description.includes('Multiplex'):
    case description.includes('IloveKebab'):
      return '🍴 restoran';
    case description.includes('Village Market'):
      return '🍔 food';
    default:
      return '🪄 other';
  }
};

const parseTransaction = (transaction: MonoTransaction): Transaction => {
  const date = toDateFromSeconds(transaction.time);

  return {
    id: transaction.id,
    monthIndex: toTransactionMonthIndex(date),
    date: toTransactionDate(date),
    time: toTransactionTime(date),
    amount: toPrice(transaction.amount),
    description: toDescription(transaction.description),
    counterName: transaction.counterName,
    category: toCategory(transaction.description),
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<string>) {
  // res.status(200).send('OK');

  if (req.method === 'POST') {
    const payload: MonoTransactionRequest = req.body;

    console.log(payload);

    if (isIncomingTransaction(payload.data.statementItem)) {
      return res.status(200).send(''); // Do not store incoming transactions
    }

    const { id: transactionId, ...transactionBody } = parseTransaction(payload.data.statementItem);

    try {
      await dbClient.set(transactionId, JSON.stringify(transactionBody));

      await googleSheet.load();
      await googleSheet.sheet.addRow(transactionBody);

      // Delete transaction from DB after it was successfully added to Google Sheet
      await dbClient.del(transactionId);
    } catch (error) {
      return res.status(500).send(`Internal Server Error: ${error}`);
    }

    return res.status(200).send('');
  }
  // Handle any other HTTP method
  res.status(200).send('');
}
