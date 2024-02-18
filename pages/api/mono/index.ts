import { dbClient } from '@/services/db';
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

    console.log(transactionId, transactionBody);

    try {
      await dbClient.set(transactionId, JSON.stringify(transactionBody));
    } catch (error) {
      return res.status(500).send(`Internal Server Error: ${error}`);
    }

    return res.status(200).send('');
  }
  // Handle any other HTTP method
  res.status(200).send('');
}
