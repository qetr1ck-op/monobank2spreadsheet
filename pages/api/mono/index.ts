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
  const lowerCaseDescription = description.toLowerCase();

  switch (true) {
    case lowerCaseDescription.includes('Епіцентр'.toLowerCase()):
    case lowerCaseDescription.includes('MEGOGO'.toLowerCase()):
    case lowerCaseDescription.includes('Нова пошта'.toLowerCase()):
    case lowerCaseDescription.includes('Netflix'.toLowerCase()):
    case lowerCaseDescription.includes('Охорона'.toLowerCase()):
    case lowerCaseDescription.includes('Холодна вода'.toLowerCase()):
    case lowerCaseDescription.includes('Електроенергія'.toLowerCase()):
    case lowerCaseDescription.includes('Опалення'.toLowerCase()):
    case lowerCaseDescription.includes('Гаряча вода'.toLowerCase()):
    case lowerCaseDescription.includes('JYSK'.toLowerCase()):
    case lowerCaseDescription.includes('Fotokhata'.toLowerCase()):
    case lowerCaseDescription.includes('Novapay'.toLowerCase()):
    case lowerCaseDescription.includes('AliExpress'.toLowerCase()):
      return '🏠 house';
    case lowerCaseDescription.includes('Сину на машину'.toLowerCase()):
    case lowerCaseDescription.includes('Solidol Barbershop'.toLowerCase()):
    case lowerCaseDescription.includes('IQOS'.toLowerCase()):
    case lowerCaseDescription.includes('CHATGPT'.toLowerCase()):
    case lowerCaseDescription.includes('vapes'.toLowerCase()):
      return '🤹‍♂️ personal orest';
    case lowerCaseDescription.includes('AUTOPARTNER'.toLowerCase()):
    case lowerCaseDescription.includes('Yaremko'.toLowerCase()):
      return '🚘 car';
    case lowerCaseDescription.includes('Amic'.toLowerCase()):
    case lowerCaseDescription.includes('OKKO'.toLowerCase()):
      return '⛽ petrol';
    case lowerCaseDescription.includes('Znakhar'.toLowerCase()):
    case lowerCaseDescription.includes('Аптека'.toLowerCase()):
    case lowerCaseDescription.includes('Будемо Здорові Разом'.toLowerCase()):
    case lowerCaseDescription.includes('Apteka 3I'.toLowerCase()):
      return '🏥 medical';
    //Zadzerkalja
    case lowerCaseDescription.includes('Софія С.'.toLowerCase()):
      return '🐣 baby kindergarden';
    case lowerCaseDescription.includes('Будинок Іграшок'.toLowerCase()):
    case lowerCaseDescription.includes('PAPASHON'.toLowerCase()):
    case lowerCaseDescription.includes('MALIaTKO'.toLowerCase()):
    case lowerCaseDescription.includes('Чудо Острів'.toLowerCase()):
      return '🐥 baby';
    case lowerCaseDescription.includes('OSONNYA'.toLowerCase()):
      return '🏝️ travel';
    case lowerCaseDescription.includes('PAPASHON'.toLowerCase()):
    case lowerCaseDescription.includes('Остерія'.toLowerCase()):
    case lowerCaseDescription.includes('Multiplex'.toLowerCase()):
    case lowerCaseDescription.includes('IloveKebab'.toLowerCase()):
      return '🍴 restoran';
    case lowerCaseDescription.includes('Village Market'.toLowerCase()):
    case lowerCaseDescription.includes('Близенько'.toLowerCase()):
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
  if (req.method === 'POST') {
    const payload: MonoTransactionRequest = req.body;

    console.log(payload);

    if (isIncomingTransaction(payload.data.statementItem)) {
      return res.status(200).send(''); // Do not store incoming transactions
    }

    const { id: transactionId, ...transactionBody } = parseTransaction(payload.data.statementItem);

    try {
      // set expiration time for 1 month
      await dbClient.set(transactionId, JSON.stringify(transactionBody), { EX: 60 * 60 * 24 * 30 });

      await googleSheet.load();
      await googleSheet.sheet.addRow(transactionBody);

      // Delete transaction from DB after it was successfully added to Google Sheet
      // await dbClient.del(transactionId);
    } catch (error) {
      return res.status(500).send(`Internal Server Error: ${error}`);
    }

    return res.status(200).send('');
  }
  // Handle any other HTTP method
  res.status(200).send('');
}
