import path from 'path';
import fs from 'fs';
import csv from 'csv-parse';
import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';

import uploadConfig from '../config/upload';

interface Request {
  csvFile: string;
}

interface TransactionDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

export default class ImportTransactionsService {
  async execute({ csvFile }: Request): Promise<Transaction[]> {
    const createTransactions = new CreateTransaction();

    const csvPath = path.join(uploadConfig.directory, csvFile);
    const readCSVStream = fs.createReadStream(csvPath, 'utf-8');
    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);
    const lineElements: TransactionDTO[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line;

      lineElements.push({ title, type, category, value });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const storeCSVTransactions = async (transactions: TransactionDTO[]) => {
      const newTransactions: Transaction[] = [];

      for (const transaction of transactions) {
        const { title, type, value, category } = transaction;
        const transactionFromImports = await createTransactions.execute({
          title,
          type,
          value,
          category,
        });

        newTransactions.push(transactionFromImports);
      }

      return newTransactions;
    };

    const newTransactions = storeCSVTransactions(lineElements);

    return newTransactions;
  }
}
