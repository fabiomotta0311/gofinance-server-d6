// import AppError from '../errors/AppError';
import { getRepository, getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

export default class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction> {
    // TODO
    const transactionRepository = await getCustomRepository(
      TransactionsRepository,
    );

    if (!['income', 'outcome'].includes(type)) {
      throw new Error('Transaction type is invalid');
    }

    const { total } = await transactionRepository.getBalance();

    if (type === 'outcome' && total < value) {
      throw new Error('You do not have enough balance');
    }

    const categoryRepository = getRepository(Category);

    const categoryExists = await categoryRepository.findOne({
      where: { title: category },
    });

    if (categoryExists) {
      const catID = categoryExists.id;
      const transaction = transactionRepository.create({
        title,
        type,
        value,
        category_id: catID,
      });
      await transactionRepository.save(transaction);

      return transaction;
    }

    const newCategoryTemplate = categoryRepository.create({ title: category });
    const newCategory = await categoryRepository.save(newCategoryTemplate);

    const transaction = transactionRepository.create({
      title,
      type,
      value,
      category_id: newCategory.id,
    });

    await transactionRepository.save(transaction);
    return transaction;
  }
}
